/*
 * express-lingua
 * A i18n middleware for the Express.js framework.
 *
 * Licensed under the MIT:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright (c) 2012, André König (andre.koenig -[at]- gmail [*dot*] com)
 *
 */

var fs = require('fs')
  , traverse = require('traverse');

module.exports = (function() {

    var _name = 'lingua:Guru';

    //
    // summary:
    //     Guru learns the languages.
    //
    // description:
    //     Loads all i18n resource files, parses and persists
    //     them in the resource cache (see above).
    //
    // exception:
    //     If there is no i18n resource file for the configured
    //     default language the guru has to throw an error.
    //
    var Guru = function(config) {
        if (!config) {
            throw new Error(_name + ': Please pass the configuration to the constructor.');
        } else {
            this.config = config;
        }

        var that = this,
            path = config.resources.path,
            files = fs.readdirSync(path);

        //
        //
        // summary:
        //     The i18n resource cache.
        //
        // description:
        //     The loaded resources. After booting the express.js
        //     application lingua will parse the complete resource
        //     directory and inserts every single i18n resource into
        //     this cache. That makes resolving the entries very fast.
        //     The flipside of the coin is that it is not possible to
        //     change the i18n resources while the application is running.
        //
        //
        this.resources = [];

        files.forEach(function (file) {
            var absolutePath = path + file;

            if (fs.statSync(absolutePath).isFile()) {
                var content = fs.readFileSync(absolutePath),
                    resource = {};

                // The ISO locale code from the filename. We remove
                // the file extension.
                resource.locale = file.replace(that.config.resources.extension, '');

                try {
                    resource.content = JSON.parse(content);
                } catch (e) {
                    throw new Error('Lingua: Error while parsing the resource: ' + resource.locale);
                }

                // DOCME
                resource.content = traverse(resource.content).map(function (value) {
                    var hasPlaceholder = function () {
                        return value.match(config.resources.placeholder);
                    };

                    if (!this.isRoot && this.isLeaf) {
                        if (hasPlaceholder()) {
                            var compile = function (data) {
                                var compiled = value;

                                if (typeof data === 'object') {
                                    for (var param in data) {
                                        // TODO: Use the pattern from the configuration object.
                                        compiled = compiled.replace(new RegExp('{'+param+'}','g'), data[param]);
                                    }
                                } else {
                                    compiled = compiled.replace(/\{(\w*)\}/g, data);
                                }

                                return compiled;
                            };

                            this.update(compile);
                        }
                    }
                });

                that.resources.push(resource);
            }
        });

        // Check if the resource for the default
        // locale is available. If not, well, ERROR!
        var available = false;
        this.resources.forEach(function(resource) {
            if (resource.locale === that.config.resources.defaultLocale) {
                available = true;
            }
        });

        if (!available) {
            throw new Error(_name + ': Please create a resource file for your default locale: '+this.config.resources.defaultLocale);
        }
    };

    //
    // summary:
    //     Shares his language knowledge.
    //
    // description:
    //     Returns the complete i18n object which was defined in
    //     the language file by the given language code.
    //     So if the "locale" is "de-de" then the guru will return
    //     the content which was defined in the "de-de.json" file.
    //
    Guru.prototype.ask = function(locales) {
        var that = this;

        var resource, i;
        
        var _filter = function(filter) {
            return that.resources.filter(function(resource) {
                return (resource.locale === filter);
            })[0];
        };

        for (i = 0; i < locales.length; i++) {
            resource = _filter(locales[i]);

            if (resource) {
                break;
            }
        }

        if (!resource) {
            resource = _filter(that.config.resources.defaultLocale);
        }

        return resource;
    };

    return Guru;
}());