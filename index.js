// TODO: remove `env` feature.

import _ from 'lodash';

import prepareForStaticWebsite from './lib/prepareForStaticWebsite';
import resolveDeployment from './lib/resolveDeployment';

/**
 * Initialize plugin with command options
 *
 * @param {Object} commander
 * @returns {Object}
 */
export function init(commander) {
  const text = '(optional) the Google Cloud Storage environment that Felfire must deploys to';

  commander
    .option('--env <env>', text)
    .option('--key-file <keyFile>', '(optional) the Google Cloud JSON key file')
    .option('--project-id <projectID>', '(optional) the Google Cloud project ID');

  return commander;
}

/**
 * Deploy sources from the build directory to Google Cloud Storage
 *
 * @param {Object} commander
 * @param {Object} compiler
 * @returns {Promise}
 */
export default function ({ commander, compiler }) {
  const pluginConfigRaw = _.find(compiler.config.plugins, plugin =>
    plugin[0] === 'google-cloud-storage');
  const message = 'Missing plugin\'s configuration properties. See all mandatory properties ' +
    'in the documentation: https://github.com/nicolascava/felfire-google-cloud-storage#' +
    'configuration.';

  if (!pluginConfigRaw) throw new Error(message);

  const pluginConfig = pluginConfigRaw[1];

  let config = {};

  if (compiler.config.mode === 'static') {
    config = { ...pluginConfig, ...prepareForStaticWebsite(compiler, commander) };
  } else {
    config = pluginConfig;
  }

  return new Promise(async (resolve) => {
    await resolveDeployment(config, commander, compiler);
    resolve();
  });
}
