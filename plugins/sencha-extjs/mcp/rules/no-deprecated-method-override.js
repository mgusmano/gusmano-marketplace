/**
 * @fileoverview Report the overriding of a deprecated method
 * @author Sencha
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const extjs = require('../utils/extjs');

module.exports = {
    meta: {
        docs: {
            description: 'Report the overriding of a deprecated method',
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
            Property (node) {
                const deprecatedMethod = extjs.getDeprecatedMethod(node);
                const message = 'Override of deprecated method \'{{name}}\' found for \'{{className}}\'. {{deprecatedMessage}}';

                if (deprecatedMethod) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: deprecatedMethod.name,
                            className: deprecatedMethod.className,
                            deprecatedMessage: deprecatedMethod.deprecatedMessage
                        },
                        fix: function (fixer) {
                            const newMethod = extjs.getDeprecatedMethodReplacement(deprecatedMethod.className, deprecatedMethod);

                            if (newMethod) {
                                // only use the newMethod if the value that was trying to be used is a method
                                // if it is not, then maybe the developer thought he was setting a config
                                // and so it is best to not do the autoFix but just report the issue
                                if (node.value.type === 'FunctionExpression' ||
                                    node.value.type === 'MemberExpression' ||
                                    (node.value.type === 'ConditionalExpression' && 
                                        (node.value.consequent.type === 'FunctionExpression' ||
                                         node.value.consequent.type === 'MemberExpression' ||
                                         node.value.alternate.type === 'FunctionExpression' ||
                                         node.value.alternate.type === 'MemberExpression')
                                    )
                                ) {
                                    // Ext.Component.removeClass deprecated message is wrong (says 'addCls')
                                    if (node.key && node.key.name === 'removeClass') {
                                        return fixer.replaceText(node.key, 'removeCls');
                                    } else {
                                        return fixer.replaceText(node.key, newMethod.name);
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
