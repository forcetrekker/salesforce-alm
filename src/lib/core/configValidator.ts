/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* --------------------------------------------------------------------------------------------------------------------
 * WARNING: This file has been deprecated and should now be considered locked against further changes.  Its contents
 * have been partially or wholely superceded by functionality included in the @salesforce/core npm package, and exists
 * now to service prior uses in this repository only until they can be ported to use the new @salesforce/core library.
 *
 * If you need or want help deciding where to add new functionality or how to migrate to the new library, please
 * contact the CLI team at alm-cli@salesforce.com.
 * ----------------------------------------------------------------------------------------------------------------- */

import * as _ from 'lodash';

import Crypto = require('./crypto');

/**
 * Ensures all the attribute values are present and have a value.
 * @param config - the object to validate
 * @param attributes - attribute object to validate against
 * @throws MissingConfigObject - if the config object is null or undefined
 * @throws MissingAttributeFromConfig - if the config object is missing an attribute defined in attributes.
 * @private
 */
const _validate = function(config, attributes) {
  if (_.isNil(config)) {
    const error = new Error('Missing config object.');
    error['name'] = 'MissingConfigObject';
    throw error;
  }

  Object.keys(attributes).forEach(key => {
    if (attributes[key].required === false) {
      return;
    }

    const value = config[attributes[key].name];

    if (_.isNil(value) || !_.isString(value) || value.trim().length < 1) {
      const error = new Error(`${attributes[key].name} is missing or invalid for this org definition.`);
      error['name'] = 'MissingAttributeFromConfig';
      throw error;
    }
  });
};

export = {
  /**
   * clones a validated config object. this will automatically decrypt or encrypt those attributes defined as secret.
   * @param config - the object to validate
   * @param attributes - attribute object to validate config against
   * {NAME: {name: [attribute name] secret: [true if the field should be encrypted.]}}
   * @param encrypt - See Crypto.js
   * @returns {Promise.<*>}
   */
  getCleanObject(config, attributes, encrypt) {
    _validate(config, attributes);

    const crypto = new Crypto();
    return crypto
      .init()
      .then(() => {
        const dataToSave = {};

        Object.keys(attributes).forEach(key => {
          const attributeValue = attributes[key];
          let configValue = config[attributeValue.name];

          if (_.isString(configValue)) {
            configValue = configValue.trim();
          }

          if (!_.isNil(configValue)) {
            if (!_.isNil(attributeValue.secret) && attributeValue.secret === true) {
              dataToSave[attributeValue.name] = encrypt ? crypto.encrypt(configValue) : crypto.decrypt(configValue);
            } else {
              dataToSave[attributeValue.name] = configValue;
            }
          }
        });
        return dataToSave;
      })
      .finally(() => {
        crypto.close();
      });
  }
};
