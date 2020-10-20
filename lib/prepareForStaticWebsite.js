import _ from 'lodash';

/**
 * Prepare deployment for static websites
 *
 * @param {Object} compiler
 * @param {Object} commander
 * @returns {Object}
 */
export default function (compiler, commander) {
  const locales = compiler.config.locales || ['en'];

  // eslint-disable-next-line no-underscore-dangle
  const args = _.find(commander.commands, command => command._name === 'google-cloud-storage');

  const { env } = args;

  return { locales, env };
}
