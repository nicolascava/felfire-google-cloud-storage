import path from 'path';
import storage from '@google-cloud/storage';
import stream from 'stream';
import mime from 'mime-types';
import fs from 'fs';
import _ from 'lodash';

import compress from './compress';

function upload(fileContent, bucketFile, metadata, options, compiler) {
  return new Promise((resolve, reject) => {
    const bufferStream = new stream.PassThrough();

    bufferStream.end(fileContent);
    bufferStream
      .pipe(bucketFile.createWriteStream({
        ...options,
        metadata,
        public: true,
      }))
      .on('error', (error) => {
        compiler.log.info(error);
        reject();
      })
      .on('finish', () => resolve());
  });
}

/**
 * Fetch files from distribution directory
 *
 * @param {Object} baseConfig
 * @param {Object} compiler
 * @param {Object} commander
 * @param {String} baseLocale
 * @returns {Promise.<Array|Promise>}
 */
export default async function (baseConfig, compiler, commander, baseLocale = null) {
  const config = _.cloneDeep(baseConfig);
  const locale = _.clone(baseLocale);
  const compressed = await compress(compiler, locale);

  // eslint-disable-next-line no-underscore-dangle
  const args = _.find(commander.commands, command => command._name === 'google-cloud-storage');

  let gcs = null;

  if (args.keyFile && args.projectId) {
    gcs = storage({
      projectId: args.projectId,
      keyFilename: args.keyFile,
    });
  } else {
    gcs = storage();
  }

  const bucket = gcs.bucket(config.bucket);

  if (compressed.assetsFiles.length > 0) {
    compiler.log.white('Deploying to ').blue(config.bucket).white('.').info();
  } else {
    compiler.log.yellow('No static assets found. Skipping deployment.').info();
  }

  compressed.assetsFiles.forEach(async (file) => {
    const fileContent = fs.readFileSync(file);
    const relativeFile = locale ?
      file.replace(path.join(process.cwd(), compiler.config.buildDir, `${locale}/`), '') :
      file.replace(path.join(process.cwd(), `${compiler.config.buildDir}/`), '');
    const definedFile = bucket.file(relativeFile);
    const isFileCompressed = compressed.compressedFiles.indexOf(file) > -1;
    const metadata = {
      contentType: mime.lookup(relativeFile),
    };
    const options = {};

    if (file.match(/\.(html)$/)) {
      metadata.cacheControl = 'no-transform, max-age=60, s-maxage=60, public';
      metadata.expires = new Date(new Date().setMinutes(new Date().getMinutes() + 1));
    } else {
      metadata.cacheControl = 'no-transform, max-age=31536000, s-maxage=31536000, public';
      metadata.expires = new Date(new Date().setYear(new Date().getFullYear() + 1));
    }

    if (isFileCompressed) options.gzip = true;

    await upload(fileContent, definedFile, metadata, options, compiler);

    if (isFileCompressed) {
      compiler.log.green(path.basename(file)).white(' is uploaded (gzipped).').info();
    } else {
      compiler.log.green(path.basename(file)).white(' is uploaded.').info();
    }
  });
}
