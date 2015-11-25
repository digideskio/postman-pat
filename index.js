#!/usr/bin/env node
var path = require('path');
var program = require('commander');
var fs = require('fs');
var newman = require('newman');
var queue = require('queue-async');

program.arguments('<file> [otherFiles...]')
.option('-e, --environment <environment>', 'The postman environment to use')
.option('-d, --data-path <dataPath>', 'The directory to search for data files')
.action(function(file, otherFiles) {
	console.log('Starting newman run for environment: %s', program.environment);
	console.log('Will search datapath: %s', program.dataPath)
	console.log(file);
	
	var allFiles = [ file ];
	if (otherFiles)	{
		otherFiles.forEach(function(otherFile) {
			console.log(otherFile);
		});
		allFiles = allFiles.concat(otherFiles);
	}
	
	runPostmanForFiles(allFiles, program.dataPath, program.environment);
})
.parse(process.argv);

function runPostmanForFiles(allFiles, dataPath, environment) {

    // queue with a concurrency of 1 - i.e. run newman tasks sequentially
	var q = queue(1);
	var tasks = [];
	allFiles.forEach(function(file) {
		
		var split = path.basename(file).split('.');
		var name = split[0];
		console.log('Looking for data for %s', name);
		
		var dataFile = path.join(dataPath, name + ".data.json");
		
		if (!fs.statSync(dataFile).isFile()) {
			console.log('Data file %s does not exist', dataFile);
			process.exit(1);
     	}
		else {
			console.log('Found data file %s', dataFile);
		}

	    tasks.push({
				file: file,
				dataFile: dataFile,
				environment: environment
			}
		);		
	})

    console.log('Queueing %s newman task(s)...', tasks.length);
	console.log('');
	tasks.forEach(function(t) {
		q.defer(runPostman, t.file, t.dataFile, t.environment);
	})

	// await all the tasks
	q.awaitAll(function(error, results) {
		console.log('');
		console.log('Finished all tasks!');
		process.exit();
	})
}

function runPostman(file, dataFile, environment, callback) {
	
	var newman = require('newman');
	var JSON5 = require('json5');

	// read the collectionJson file
	var collectionJson = fs.readFileSync(file, 'utf8');
	var collection = JSON5.parse(collectionJson);
	
	// define Newman options
	var newmanOptions = {
		envJson: JSON5.parse(fs.readFileSync(environment, "utf-8")), // environment file (in parsed json format)
		dataFile: dataFile,                    // data file if required
		iterationCount: 1,                    // define the number of times the runner should run
		stopOnError: false,
		responseHandler: "TestResponseHandler"
	}
	
	console.log('');
	console.log('Running %s...', collection.name);
	
	newman.execute(collection, newmanOptions, function() {
		callback();
	});
}


