import _ from 'lodash';

import uploadFiles from './uploadFiles';

/**
 * Resolve file deployment to Google Cloud Storage
 *
 * @param {Object} config
 * @param {Object} commander
 * @param {Object} compiler
 * @returns {Promise.<*>}
 */
export default function (config, commander, compiler) {
  return new Promise(async (resolve) => {
    const mutableConfig = config;

    // eslint-disable-next-line no-underscore-dangle
    const args = _.find(commander.commands, command => command._name === 'google-cloud-storage');

    if (compiler.config.mode === 'static') {
      let resolvedCount = 0;

      return mutableConfig.locales.forEach(async (locale) => {
        if (args.env === 'staging' && mutableConfig.locales.indexOf(locale) === 0) {
          mutableConfig.bucket = mutableConfig.bucket.indexOf('www.') > -1 ?
            mutableConfig.bucket.replace('www.', 'staging.') : `staging.${mutableConfig.bucket}`;
        }

        if (args.env === 'staging' && mutableConfig.locales.indexOf(locale) > 0) {
          mutableConfig.bucket = mutableConfig.bucket.indexOf('www.') > -1 ?
            mutableConfig.bucket.replace('www.', `staging.${locale}.`) :
            `staging.${locale}.${mutableConfig.bucket}`;
        }

        if (args.env === 'prod' && mutableConfig.locales.indexOf(locale) > 0) {
          mutableConfig.bucket = mutableConfig.bucket.indexOf('www.') > -1 ?
            mutableConfig.bucket.replace('www.', `${locale}.`) :
            `${locale}.${mutableConfig.bucket}`;
        }

        await uploadFiles(mutableConfig, compiler, commander, locale);

        resolvedCount += 1;

        if (resolvedCount === mutableConfig.locales.length) return resolve();

        return locale;
      });
    }

    await uploadFiles(mutableConfig, compiler, commander);

    return resolve();
  });
}
