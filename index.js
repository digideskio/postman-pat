#!/usr/bin/env node
var newman = require('newman');
var JSON5 = require('json5');
var path = require('path');
var program = require('commander');
var fs = require('fs');
var newman = require('newman');
var queue = require('queue-async');
var chalk = require('chalk');

program.arguments('<file> [otherFiles...]')
.option('-e, --environment <environment>', 'The postman environment to use')
.option('-d, --data-path <dataPath>', 'The directory to search for data files')
.action(function(file, otherFiles) {

	var allFiles = [ file ];
	if (otherFiles)	{
		allFiles = allFiles.concat(otherFiles);
	}
	console.log(chalk.bold.gray.bgMagenta('                                              '));
	console.log(chalk.bold.gray.bgMagenta(' Pat: the newman runner                       '));
	console.log(chalk.bold.gray.bgMagenta('                                              '));
    console.log('');
	allFiles.forEach(function(file)	{
		console.log(chalk.yellow('Collection: %s'), file);
	})
	console.log('');
	console.log(chalk.yellow.underline('Total: ' + allFiles.length + ' file(s)'));
	console.log('');
	console.log(chalk.cyan('Environment: %s'), program.environment);
	console.log(chalk.blue('Data path: %s'), program.dataPath);
	console.log('');
	
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

		var dataFile = path.join(dataPath, name + ".data.json");
		
		try	{
			if (!fs.statSync(dataFile).isFile()) {
				console.log(chalk.bold.red('Data file for %s does not exist at: %s'), name, dataFile);
				process.exit(1);
			}
			else {
				console.log('Found data for %s at: %s', name, dataFile);
			}
		}
		catch (error) {
			console.log(chalk.bold.red('Data file for %s does not exist at: %s'), name, dataFile);
		    process.exit(1);
		}
		
	    tasks.push({
				file: file,
				dataFile: dataFile,
				environment: environment
			}
		);		
	})

    console.log('Queueing %s newman task(s)...', tasks.length);

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


