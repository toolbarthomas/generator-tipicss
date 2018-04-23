const ENV = require('dotenv').config();
const Generator = require('yeoman-generator');
const Chalk = require('chalk');
const Fse = require('fs-extra');
const Path = require('path');
const Replace = require('replace-in-file');
const Cwd = process.cwd();
const UpdateNotifier = require('update-notifier');
const Package = {
    path: __dirname + '/../../package.json'
}

// Check if we have a source path defined for our Environment variable
// Set a default value if we no value has been defined
if (!process.env.TIPICSS_SRC) {
    process.env.TIPICSS_SRC = './src';
}

// Check the package.json and show a notice if any upadtes are available.
if (Fse.existsSync(Package.path)) {

    // Parse the package.json contents and use it for the update notifier package
    var pkg = JSON.parse(Fse.readFileSync(Package.path));

    // Init the Update Notifier with an interval of 24 hours
    UpdateNotifier({
        pkg,
        updateCheckInterval: 1000 * 60 * 60
    }).notify();
}


// Extend Yeoman with TIPICSS
class Tipicss extends Generator {

    getOutputConfig(category, title) {

        // Create an empty configuration array that stores the configuration defined per type: Module, Group or Template
        // We use this configuration array in our callback
        var output_config = [];

        // Set the selected category defined within our Yeoman Prompt: module, group or template
        output_config.category = category;

        // Define values for our callback
        // These values will be updated based on the specified choice
        var base_folder = 'templates';
        var files_to_rename = [];
        var files_to_replace = [
            'stylesheets/index.scss',
            'javascripts/index.js'
        ];
        var success_message = 'Template Created!';

        if(category == 'group') {

            base_folder = 'groups';

            files_to_rename = [];

            files_to_replace = [
                'pages/index.twig',
                'stylesheets/index.scss',
                'javascripts/index.js'
            ];

            success_message = 'Group created!';

        }

        else if (category == 'module') {

            base_folder = 'modules';

            files_to_rename = [
                'partials/index.twig'
            ];

            files_to_replace = [
                'stylesheets/index.scss',
                'javascripts/index.js'
            ];

            success_message = 'Module created!';

        }

        // Destination folder for our new Group
        output_config.base_folder = base_folder;

        // Array of files we wan't to rename
        output_config.files_to_rename = files_to_rename;

        // Success message we wan't to dispay when Yoeman is done
        output_config.success_message = success_message;

        // Custom callback function for our current Group
        output_config.callback = function (src, labels) {

            for (var index = 0; index < files_to_replace.length; index++) {
                files_to_replace[index] = src + '/' + files_to_replace[index];
            }

            // Find and replace the following files after the scaffold
            Replace({
                files: files_to_replace,
                from: [
                    /__TITLE__/g,
                    /__TYPE__/g,
                    /__TEMPLATE__/g,
                ],
                to: [
                    labels.title,
                    labels.type,
                    labels.template
                ],
                encoding: 'utf8'
            });
        };

        return output_config;
    }
}

module.exports = class extends Tipicss {
    prompting() {
        this.log('');
        this.log(Chalk.green('Welcome to Tipicss module generator.') + '\n');
        this.log(
            Chalk.green(
                'This setup will let you create a new module within the specified category'
            ) + '\n'
        );
        this.log(
            Chalk.reset('See: https://github.com/toolbarthomas/generator-tipicss') + '\n'
        );

        const prompts = [
            {
                type: 'list',
                name: 'category',
                message: "Which type do you wan't to scaffold.",
                choices: ['module', 'group', 'template'],
                default: 0
            },
            {
                type: 'input',
                name: 'title',
                message: 'Name your new partial.',
                default: 'new',
                filter: function(name) {
                    return (name = name.split(' ').join('-'));
                }
            },
            {
                when: function(response) {
                    return response.category == 'group';
                },
                name: 'template',
                message: 'For wich template is this page meant for?',
                default: 'default'
            },
            {
                type: 'confirm',
                name: 'destination',
                message: 'Do you want to scaffold your partial within the Tipicss project structure? (' + process.env.TIPICSS_SRC +')',
                default: 0
            }
        ];

        return this.prompt(prompts).then(props => {
            // To access props later use this.props.someAnswer;
            this.props = props;

            this.log(Chalk.green('Affirmative, ready to setup ' + this.props.title));
        });
    }

    writing() {
        var category = this.props.category;
        var title = this.props.title;
        var template = this.props.template;

        var output_config = this.getOutputConfig(this.props.category, title);

        var dest = Cwd + '/' + title;
        // Set the generated files destination
        if (this.props.destination) {
            dest = process.env.TIPICSS_SRC + '/' + output_config.base_folder + '/' + title;
        }

        // Create file structure for the selected type
        Fse.copy(this.templatePath(output_config.category), this.destinationPath(dest))
        .then(() => {
            this.log(Chalk.yellow('Structure created, creating files...'));

            if (output_config.files_to_rename.length == 0) {
                output_config.callback(dest, {
                    title: title,
                    type: category,
                    template: template
                });

                return;
            }

            // Queuer to fire up the callback
            var queue = 0;
            output_config.files_to_rename.forEach(function(base_file) {

                var rename = {
                    input: dest + '/' + base_file,
                    output: Path.dirname(dest + '/' + base_file) + '/' + this.props.title + '.' + Path.extname(base_file).split('.').pop()
                };

                // Rename the base files
                Fse.rename(rename.input, rename.output, function(error) {
                    if (error) {
                        throw error;
                    }

                    queue++;

                    // Init the callback when all files have been renamed
                    if (queue < output_config.files_to_rename.length) {
                        return;
                    }

                    // Proceed if we have a callback defined
                    if (typeof output_config.callback !== 'function') {
                        return;
                    }

                    output_config.callback(dest, {
                        title: title,
                        type: category,
                        template: template
                    });
                });
            }, this);

            this.log(Chalk.green(output_config.success_message));
        })
        .catch(error => {
            this.log(Chalk.red('An error has occured: ' + error));
        });
    }
};
