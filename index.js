#!/usr/bin/env node
var program = require('commander');

program.arguments('<file> [otherFiles...]')
.option('-e, --environment <environment>', 'The postman environment to use')
.action(function(file, otherFiles) {
	console.log('environment: %s file: %s', program.environment, file);
	if (otherFiles)	{
		otherFiles.forEach(function(element) {
			console.log(element);
		});
	}
})
.parse(process.argv);
