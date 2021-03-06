/**
 * A back-end bootstrap module with commonly used methods for loading user data
 * @param {Function} require
 * @param {Underscore} _  
 */
emmet.define('bootstrap', function(require, _) {
	
	/**
	 * Returns file name part from path
	 * @param {String} path Path to file
	 * @return {String}
	 */
	function getFileName(path) {
		var re = /([\w\.\-]+)$/i;
		var m = re.exec(path);
		return m ? m[1] : '';
	}
	
	/**
	 * Returns base path (path to folder of file)
	 * @param {String} path Path to file
	 * @return {String}
	 */
	function getBasePath(path) {
		return path.substring(0, path.length - getFileName(path).length);
	}
	
	return {
		/**
		 * Loads Emmet extensions. Extensions are simple .js files that
		 * uses Emmet modules and resources to create new actions, modify
		 * existing ones etc.
		 * @param {Array} fileList List of absolute paths to files in extensions 
		 * folder. Back-end app should not filter this list (e.g. by extension) 
		 * but return it "as-is" so bootstrap can decide how to load contents 
		 * of each file.
		 * This method requires a <code>file</code> module of <code>IEmmetFile</code> 
		 * interface to be implemented.
		 * @memberOf bootstrap
		 */
		loadExtensions: function(fileList) {
			var file = require('file');
			var payload = {};
			var utils = require('utils');
			var userSnippets = null;
			
			_.each(fileList, function(f) {
				switch (file.getExt(f)) {
					case 'js':
						try {
							eval(file.read(f));
						} catch (e) {
							emmet.log('Unable to eval "' + f + '" file: '+ e);
						}
						break;
					case 'json':
						var fileName = getFileName(f).toLowerCase().replace(/\.json$/, '');
						if (/^snippets/.test(fileName)) {
							if (fileName === 'snippets') {
								// data in snippets.json is more important to user
								userSnippets = this.parseJSON(file.read(f));
							} else {
								payload.snippets = utils.deepMerge(payload.snippets || {}, this.parseJSON(file.read(f)));
							}
						} else {
							payload[fileName] = file.read(f);
						}
						
						break;
				}
			}, this);
			
			if (userSnippets) {
				payload.snippets = utils.deepMerge(payload.snippets || {}, userSnippets);
			}
			
			this.loadUserData(payload);
		},
		
		/**
		 * Loads preferences from JSON object (or string representation of JSON)
		 * @param {Object} data
		 * @returns
		 */
		loadPreferences: function(data) {
			require('preferences').load(this.parseJSON(data));
		},
		
		/**
		 * Loads user snippets and abbreviations. It doesn’t replace current
		 * user resource vocabulary but merges it with passed one. If you need 
		 * to <i>replaces</i> user snippets you should call 
		 * <code>resetSnippets()</code> method first
		 */
		loadSnippets: function(data) {
			data = this.parseJSON(data);
			
			var res = require('resources');
			var userData = res.getVocabulary('user') || {};
			res.setVocabulary(require('utils').deepMerge(userData, data), 'user');
		},
		
		/**
		 * Helper function that loads default snippets, defined in project’s
		 * <i>snippets.json</i>
		 * @param {Object} data
		 */
		loadSystemSnippets: function(data) {
			require('resources').setVocabulary(this.parseJSON(data), 'system');
		},
		
		/**
		 * Removes all user-defined snippets
		 */
		resetSnippets: function() {
			require('resources').setVocabulary({}, 'user');
		},
		
		/**
		 * Helper function that loads all user data (snippets and preferences)
		 * defined as a single JSON object. This is useful for loading data 
		 * stored in a common storage, for example <code>NSUserDefaults</code>
		 * @param {Object} data
		 */
		loadUserData: function(data) {
			data = this.parseJSON(data);
			if (data.snippets) {
				this.loadSnippets(data.snippets);
			}
			
			if (data.preferences) {
				this.loadPreferences(data.preferences);
			}
			
			if (data.profiles) {
				this.loadProfiles(data.profiles);
			}
			
			var profiles = data.syntaxProfiles || data.syntaxprofiles;
			if (profiles) {
				this.loadSyntaxProfiles(profiles);
			}
		},
		
		/**
		 * Resets all user-defined data: preferences, snippets etc.
		 * @returns
		 */
		resetUserData: function() {
			this.resetSnippets();
			require('preferences').reset();
			require('profile').reset();
		},
		
		/**
		 * Load syntax-specific output profiles. These are essentially 
		 * an extension to syntax snippets 
		 * @param {Object} profiles Dictionary of profiles
		 */
		loadSyntaxProfiles: function(profiles) {
			profiles = this.parseJSON(profiles);
			var snippets = {};
			_.each(profiles, function(options, syntax) {
				if (!(syntax in snippets)) {
					snippets[syntax] = {};
				}
				snippets[syntax].profile = options;
			});
			
			this.loadSnippets(snippets);
		},
		
		/**
		 * Load named profiles
		 * @param {Object} profiles
		 */
		loadProfiles: function(profiles) {
			var profile = require('profile');
			_.each(this.parseJSON(profiles), function(options, name) {
				profile.create(name, options);
			});
		},
		
		/**
		 * Dead simple string-to-JSON parser
		 * @param {String} str
		 * @returns {Object}
		 */
		parseJSON: function(str) {
			if (_.isObject(str))
				return str;
			
			try {
				return (new Function('return ' + str))();
			} catch(e) {
				return {};
			}
		}
	};
});