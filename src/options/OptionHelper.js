'use strict';
const _ = require('lodash');
const defaults = require('./default');

class OptionHelper {

  constructor(grunt, task) {
    this.grunt = grunt;
    this.task = task;
  }

  generateOptions() {
    const baseOptions = this.getWithPlugins([this.task.name, 'options']);
    if (Array.isArray(baseOptions)) throw new Error('webpack.options must be an object, but array was provided');

    return defaults.mergeOptions(
      this.getDefaultOptions(),
      baseOptions,
      this.getWithPlugins([this.task.name, this.task.target])
    );
  }

  getOptions() {
    if (!this.options) {
      this.options = this.generateOptions();
    }

    return this.options;
  }

  get(name) {
    const options = this.getOptions();
    let option = undefined;

    if (Array.isArray(options)) {
      let value = undefined;
      options.some((opt) => {
        value = opt[name];
        return value != undefined;
      });

      option = value;
    } else {
      option = options[name];
    }

    return typeof option === 'function' ? option(options) : option;
  }

  getWithPlugins(ns) {
    const obj = this.grunt.config(ns) || {};

    if (Array.isArray(obj)) {
      obj.forEach((options, index) => {
        this.fixPlugins(options, ns.concat([`${index}`]));
      });
    } else {
      this.fixPlugins(obj, ns);
    }

    return obj;
  }

  fixPlugins(obj, ns) {
    const pluginProps = [
      ['plugins'],
      ['resolve', 'plugins'],
      ['webpack', 'plugins'],
      ['webpack', 'resolve', 'plugins']
    ];

    pluginProps.forEach(prop => {
      const path = prop.join('.');
      if (_.get(obj, path)) {
        // getRaw must be used or grunt.config will clobber the types (i.e.
        // the array won't a BannerPlugin, it will contain an Object)
        const plugins = this.grunt.config.getRaw(ns.concat(prop));
        _.set(obj, path, plugins.map(plugin => this.fixPlugin(plugin)));
      }
    });

    return obj;
  }

  fixPlugin(plugin) {
    if (typeof plugin === 'function') return plugin;

    // Operate on a copy of the plugin, since the webpack task
    // can be called multiple times for one instance of a plugin
    const instance = Object.create(plugin);
    Object.keys(plugin).forEach((key) => {
      if (typeof plugin[key] === 'string') {
        instance[key] = this.grunt.template.process(plugin[key]);
      }
    });

    return instance;
  }

  filterGruntOptions(options) {
    const result = Object.assign({}, options);
    Object.keys(defaults.gruntOptions).forEach(key => delete result[key]);

    return result;
  }
}

module.exports = OptionHelper;
