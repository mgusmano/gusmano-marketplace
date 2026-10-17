/**
 * @fileoverview Report the overriding of an existing method
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
            description: 'Report the overriding of a existing method',
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
                const existingMethod = extjs.getExistingMethod(node);
                const message = 'Override of existing method \'{{name}}\' found for \'{{className}}\'.';
                const accessorMessage = 'Override of existing method \'{{name}}\', for the \'{{accessor}}\' config, found for \'{{className}}\'.';

                if (existingMethod
                    && !(existingMethod.template || extjs.isExtComponentTemplateMethod(existingMethod.className, existingMethod.name)) 
                    && (existingMethod.name !== 'constructor')
                ) {
                    context.report({
                        node,
                        message: existingMethod.accessor ? accessorMessage : message,
                        data: {
                            accessor: existingMethod.accessor ? existingMethod.name : '',
                            name: existingMethod.accessor ? node.key.name : existingMethod.name,
                            className: existingMethod.className
                        }
                    });
                }
            }
        };
    }
};
