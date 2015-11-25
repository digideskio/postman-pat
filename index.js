#!/usr/bin/env node
var path = require('path');
var program = require('commander');
var fs = require('fs');
var newman = require('newman');

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
		allFiles.concat(otherFiles);
	}
	
	runPostmanForFiles(allFiles, program.dataPath, program.environment);
})
.parse(process.argv);

function runPostmanForFiles(allFiles, dataPath, environment) {
	allFiles.forEach(function(file) {
		
		var split = path.basename(file).split('.');
		console.log('Looking for data for %s', split[0]);
		
		var dataFile = path.join(dataPath, split[0] + ".data.json");
	    console.log('Checking %s', dataFile);
		
		if (!fs.statSync(dataFile).isFile()) {
			console.log('File does not exist');
			process.exit(1);
     	}
		
		runPostman(file, dataFile, environment);	
	})
}

function runPostman(file, dataFile, environment) {
	
	var newman = require('newman');
	var JSON5 = require('json5');

	// read the collectionjson file
	var collectionJson = fs.readFileSync(file, 'utf8');
	var collection = JSON5.parse(collectionJson);
	
	// define Newman options
	var newmanOptions = {
		envJson: JSON5.parse(fs.readFileSync(environment, "utf-8")), // environment file (in parsed json format)
		dataFile: dataFile,                    // data file if required
		iterationCount: 1,                    // define the number of times the runner should run
		outputFile: null,            // the file to export to
		responseHandler: null, // the response handler to use
		stopOnError: false
	}
	
	newman.execute(collection, newmanOptions);
}
