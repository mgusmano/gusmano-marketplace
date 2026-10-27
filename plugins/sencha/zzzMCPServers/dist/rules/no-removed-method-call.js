/**
 * @fileoverview Report the calling of a removed method
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
            description: 'Report the calling of a removed method',
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
                const removedMethod = extjs.getRemovedMethod(node);
                const message = 'Call to removed method \'{{name}}\' found for \'{{className}}\'';

                if (removedMethod) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            name: removedMethod.name,
                            className: removedMethod.className
                        },
                        fix: function (fixer) {
                            // for addEvents() call, just comment it out as the fix
                            if (removedMethod.name === 'addEvents') {
                                if (node.object.type === 'ThisExpression') {
                                    return fixer.replaceText(node, `//this.${removedMethod.name}`);
                                } else if (node.object.type === 'Identifier') {
                                    return fixer.replaceText(node, `//${node.object.name}.${removedMethod.name}`);
                                } else {
                                    return false; // not sure exactly what we have so just return false and not fix the issue
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
