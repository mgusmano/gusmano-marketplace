/**
 * @fileoverview Report the usage of a deprecated config
 * @author Sencha
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const extjs = require('../utils/extjs');
const utils = require('../utils/utils');

module.exports = {
    meta: {
        docs: {
            description: 'Report the usage of a deprecated config',
            category: 'Fill me in',
            recommended: false
        },
        fixable: 'code', // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        const sourceCode = context.getSourceCode();

        return {
            Program () {
                extjs.init(context);
            },
            Property (node) {
                const deprecatedConfig = extjs.getDeprecatedConfig(node);
                const message = 'Usage of deprecated config \'{{name}}\' found for \'{{className}}\'. {{deprecatedMessage}}';

                if (deprecatedConfig) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: deprecatedConfig.name,
                            className: deprecatedConfig.className,
                            deprecatedMessage: deprecatedConfig.deprecatedMessage
                        },
                        fix: function (fixer) {
                            const newConfig = extjs.getDeprecatedConfigReplacement(deprecatedConfig.className, deprecatedConfig);

                            if (newConfig) {
                                if (newConfig.name === 'mode') {
                                    if (node.key.name === 'multiSelect' && node.value.value === true) {
                                        return fixer.replaceText(node, 'selModel: {mode: "MULTI"}');
                                    }
                                    if (node.key.name === 'simpleSelect' && node.value.value === true) {
                                        return fixer.replaceText(node, 'selModel: {mode: "SIMPLE"}');
                                    }
                                } else if ((deprecatedConfig.className === 'Ext.Component' || extjs.isSubClass(deprecatedConfig.className, 'Ext.Component', deprecatedConfig.foundOnVersion))
                                            && deprecatedConfig.name === 'autoLoad'
                                            && newConfig.name === 'loader'
                                ) {
                                    if (utils.isLiteral(node.value)) {
                                        return fixer.replaceText(node, `${newConfig.name}: {url: ${sourceCode.getText(node.value)}, autoLoad: true}`);
                                    } else {
                                        return fixer.replaceText(node, `${newConfig.name}: ${sourceCode.getText(node.value)}`);
                                    }
                                } else {
                                    // TODO - is this safe to do with just the parsed deprecatedMessage?
                                    return fixer.replaceText(node.key, newConfig.name);
                                }
                            }
                            return false;
                        }
                    });
                }
            }
        };
    }
};
