'use strict';
const generator = require('yeoman-generator');
const chalk = require('chalk');
const path = require('path');
const fse = require('fs-extra');
const del = require('del');
const download = require('download-git-repo');

module.exports = class extends generator {
  prompting() {
    this.log('');
    this.log(chalk.green('Welcome to Tipicss') + '\n');
    this.log(chalk.green('This setup will install the latest version of Tipicss') + '\n');
    this.log(chalk.reset('See: https://github.com/toolbarthomas/tipicss') + '\n');

    const prompts = [
      {
        type: 'input',
        name: 'path',
        message: 'Define an additional path to install Tipicss',
        default: '.',
        filter: function(name) {
          name = name.split(' ').join('-');

          return name;
        },
        validate: function(name) {
          var done = this.async();

          // Clone into current directory
          if (name === '') {
            fse.readdir(__dirname, function(err, files) {
              if (err) {
                done(error);
              } else if (!files.length) {
                done('Root directory is not empty, aborting.', false);
              }
            });
          } else {
            fse.pathExists(name, (error, exists) => {
              if (error) {
                done(error, false);
                return;
              }

              if (exists) {
                done('Directory already exists! Please use another destination.');
              }
            });
          }

          done(null, true);
        }
      },
      {
        type: 'list',
        name: 'branch',
        message: 'Select the desired branch to download',
        choices: [
          {
            value: 'master',
            name: 'Master (stable)'
          },
          {
            value: 'develop',
            name: 'Develop (latest)'
          }
        ],
        default: 0
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = props;

      this.log(chalk.green('Ready to download...'));
    });
  }

  writing() {
    var done = this.async();
    var props = this.props;
    var $this = this;

    download('github:toolbarthomas/tipicss#' + props.branch, props.path, function(error) {
      if (error) {
        return error;
      }

      if (props.path != '.') {
        process.chdir(props.path);
      }

      $this.install();
    });
  }

  end() {
    this.installDependencies({
      npm: true,
      bower: false,
      yarn: false
    });
  }
};
