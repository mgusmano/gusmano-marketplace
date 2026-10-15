/**
 * @fileoverview Report the overriding of an existing alias
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
            description: 'Report the overriding of a existing alias',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null,
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
                const message = 'Override of existing alias \'{{aliasName}}\' found for \'{{className}}\'.';
                let aliasName, existingAlias;

                if (node.parent && node.parent.parent && extjs.isExtDefine(node.parent.parent)) {
                    aliasName = extjs.getAliasName(node);
                    if (aliasName) {
                        existingAlias = extjs.getExistingAlias(node);
                    }
                }

                if (existingAlias) {
                    context.report({
                        node,
                        message: message,
                        data: {
                            aliasName: aliasName,
                            className: existingAlias.name
                        }
                    });
                }
            }
        };
    }
};
