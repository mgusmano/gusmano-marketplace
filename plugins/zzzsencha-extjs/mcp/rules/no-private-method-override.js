/**
 * @fileoverview Report the overriding of a private method
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
            description: 'Report the overriding of a private method',
            category: 'Fill me in',
            recommended: false
        },
        fixable: null, // or "code" or "whitespace"
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
                const privateMethod = extjs.getPrivateMethod(node);
                const message = 'Override of private method \'{{name}}\' found for \'{{className}}\'';
                const accessorMessage = 'Override of private method \'{{name}}\', for the \'{{accessor}}\' config, found for \'{{className}}\'.';

                if (privateMethod
                    && !(privateMethod.template || extjs.isExtComponentTemplateMethod(privateMethod.className, privateMethod.name)) 
                    && (privateMethod.name !== 'constructor')
                ) {
                    context.report({
                        node,
                        message: privateMethod.accessor ? accessorMessage : message,
                        data: {
                            accessor: privateMethod.accessor ? privateMethod.name : '',
                            name: privateMethod.accessor ? node.key.name : privateMethod.name,
                            className: privateMethod.className
                        }
                    });
                }
            }
        };
    }
};
