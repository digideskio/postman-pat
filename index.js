#!/usr/bin/env node
var JSON5 = require('json5');
var path = require('path');
var program = require('commander');
var fs = require('fs');
var queue = require('queue-async');
var chalk = require('chalk');
var newman = require('newman');
var runCount = 1;
var failCount = 0;
var successCount = 0;

program.arguments('<file> [otherFiles...]')
.option('-e, --environment <environment>', 'The postman environment to use')
.option('-d, --data-path <dataPath>', 'The directory to search for data files')
.option('-r, --repetitions <repetitions>', 'The number of times to repeat (not the same as newman "iterations")')
.action(function(file, otherFiles) {

	var allFiles = [ file ];
	if (otherFiles)	{
		allFiles = allFiles.concat(otherFiles);
	}

    console.log('');	
	console.log(chalk.magenta('Pat: the newman runner /////////'));
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
		q.defer(runPostmanExternal, t.file, t.dataFile, t.environment);
	})

	// await all the tasks
	q.awaitAll(function(error, results) {
		console.log('');
		console.log('Finished all tasks for this run...');
		if (runCount++ > program.repetitions) {
			console.log(chalk.magenta('Finished all runs.'));
			process.exit();
		}
		else {
			console.log('');
			console.log(chalk.magenta('Run #%s'), runCount);
			console.log('');
			runPostmanForFiles(allFiles, dataPath, environment);
		}
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

function runPostmanExternal(file, dataFile, environment, callback) {
	
	var collectionJson = fs.readFileSync(file, 'utf8');
	var collection = JSON5.parse(collectionJson);
	
	console.log('');
	console.log('Running %s tests...', collection.name);
	
	var cmd = 'newman'
	var args = [ '-c', file, 
 				 '-e', environment, 
  				 '-d', dataFile,
				 '-r', 40000, // timeout
				 '-n', '1', // iterations
				 '-j', // don't print summary
				 '-x']; // use non-zero exit code to indicate one or more tests failed.

	var spawn = require('child_process').spawn;
    var newman = spawn(cmd, args);

	newman.stdout.on('data', function (data) {
		process.stdout.write(data);
	});
	
	newman.stderr.on('data', function (data) {
		process.stderr.write(data);
	});
	
	newman.on('close', function (code) {
		
		if (code !== 0) {
			console.log(chalk.red(''));
			console.log(chalk.red('✗ One or more tests failed in this collection'));
			failCount++;
		}
		else {
			console.log(chalk.green(''));
			console.log(chalk.green('✔ Clean sweep!'));
			successCount++;
		}
		
		callback();
	});
}



