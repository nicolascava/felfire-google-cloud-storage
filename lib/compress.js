import recursive from 'recursive-readdir';
import path from 'path';
import zlib from 'zlib';
import fs from 'fs';
import _ from 'lodash';

/**
 * Compress HTML, CSS, and JavaScript files with GZIP
 *
 * @param {Object} felfire
 * @param {String} locale
 * @returns {Array|Promise}
 */
export default async function (felfire, locale) {
  return new Promise((resolve) => {
    const algorithm = zlib.gzip;
    const assetsDir = locale ?
      path.join(process.cwd(), './build', locale) : path.join(process.cwd(), './build');
    const ignoredNonCompressiveFiles = [
      '*.{css,js,txt,xml,ico}',
      'package.json',
      'webpack-assets.json',
      'index.js',
      'static.js',
      'node_modules',
    ];
    const ignoredCompressiveFiles = ['!*.{css,js}', 'index.js', 'node_modules', 'static.js'];

    recursive(assetsDir, ignoredNonCompressiveFiles, (nonCompressibleErr, nonCompressibleFiles) => {
      recursive(assetsDir, ignoredCompressiveFiles, (compressibleErr, compressibleFiles) => {
        const compressedFiles = [];
        const toCompressFiles = _.clone(compressibleFiles);

        let originalSize = 0;

        if (toCompressFiles.length > 0) {
          return compressibleFiles.map((file) => {
            const content = fs.readFileSync(file, 'utf-8');

            originalSize = content.length;

            return algorithm(content, {
              level: 9,
            }, (algorithmErr, result) => {
              toCompressFiles.splice(toCompressFiles.indexOf(file), 1);

              if (result.length / originalSize > 0.8) {
                compressedFiles.push(file);

                felfire.log.green(path.basename(file)).white(' will be gzipped.').info();
              }

              if (toCompressFiles.length === 0) {
                return resolve({
                  assetsFiles: compressibleFiles.concat(nonCompressibleFiles),
                  compressedFiles,
                });
              }

              return result;
            });
          });
        }

        return resolve({
          assetsFiles: compressibleFiles.concat(nonCompressibleFiles),
          compressedFiles,
        });
      });
    });
  });
}
