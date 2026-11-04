const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// SGEE Firebase Android BoM override';

module.exports = function withFirebaseBom(config, { bom = '34.19.0' } = {}) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (!contents.includes(MARKER)) {
      config.modResults.contents = `${contents.trimEnd()}\n\n${MARKER}\nproject.ext {\n  set('react-native', [versions: [firebase: [bom: '${bom}']]])\n}\n`;
    }

    return config;
  });
};
