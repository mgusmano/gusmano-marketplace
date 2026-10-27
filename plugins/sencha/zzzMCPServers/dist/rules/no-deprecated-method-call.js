/**
 * @fileoverview Report the calling of a deprecated method
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
            description: 'Report the calling of a deprecated method',
            category: 'Fill me in',
            recommended: false
        },
        fixable: 'code', // or "code" or "whitespace"
        schema: [
            // fill in your schema
        ]
    },

    create: function (context) {
        return {
            Program () {
                extjs.init(context);
            },

            MemberExpression (node) {
                const deprecatedMethod = extjs.getDeprecatedMethod(node);
                const message = 'Call to deprecated method \'{{name}}\' found for \'{{className}}\'. {{deprecatedMessage}}';

                // in 4.x Ext.SomeClass.override() is flagged as deprecated and to use Ext.define() instead
                // however, in 5.x and 6.x the deprecated flag is removed and this is allowed
                if (deprecatedMethod && deprecatedMethod.name !== 'override') {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: deprecatedMethod.name,
                            className: deprecatedMethod.className,
                            deprecatedMessage: deprecatedMethod.deprecatedMessage
                        },
                        fix: function (fixer) {
                            let newMethod;
                            const fullyQualifedMethodCall = `${deprecatedMethod.className}.${deprecatedMethod.name}`;

                            // currently cannot provide a proper fix for Ext.extend() calls
                            if (fullyQualifedMethodCall !== 'Ext.extend') {
                                newMethod = extjs.getDeprecatedMethodReplacement(deprecatedMethod.className, deprecatedMethod);
                            }

                            if (newMethod) {
                                // this.updateLayout();
                                if (node.object && node.object.type === 'ThisExpression') {
                                    return fixer.replaceText(node, `this.${newMethod.name}`);
                                }
                                // var me = this;
                                // me.updateLayout();
                                else if (node.object && utils.isIdentifierThisExpression(node.object)) {
                                    return fixer.replaceText(node.property, `${newMethod.name}`);
                                }
                                // Ext.clean() >>> Ext.Array.clean();
                                else if (node.object && node.object.type === 'Identifier' && (node.object.name.indexOf('Ext') === 0)) {
                                    return fixer.replaceText(node, `${newMethod.className}.${newMethod.name}`);
                                }
                                // var x = Ext;
                                // x.clean() >>> x.Array.clean();
                                else if (node.object && node.object.type === 'Identifier') {
                                    const identiferValue = utils.getIdentifierValue(node.object);
                                    if (typeof identiferValue === 'string') {
                                        const regex = new RegExp(`^${identiferValue}`);
                                        const newMemberExpression = newMethod.className.replace(regex, node.object.name);
                                        return fixer.replaceText(node, `${newMemberExpression}.${newMethod.name}`);
                                    } else {
                                        return false;
                                    }
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
