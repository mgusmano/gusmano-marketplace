'use strict';

// Private

const utils = require('./utils');
const fs = require('fs');
const path = require('path');

const extjsDefaultSettings = {
    toolkit: 'classic',
    version: '8.1.0'
};

const doxiVersionsMap = {
    classic: {
        '4': '4.0.7',
        '4.0': '4.0.7',
        '4.1': '4.1.3',
        '4.2': '4.2.6',
        '4.x': '4.2.6',
        '4.latest': '4.2.6',
        '5': '5.0.1',
        '5.0': '5.0.1',
        '5.1': '5.1.4',
        '5.x': '5.1.4',
        '5.latest': '5.1.4',
        '6': '6.0.2',
        '6.0': '6.0.2',
        '6.2': '6.2.1',
        '6.5': '6.5.3',
        '6.6': '6.6.0',
        '6.7': '6.7.0',
        '6.x': '6.7.0',
        '6.latest': '6.7.0',
        '7': '7.0.0',
        '7.0': '7.0.0',
        '7.1': '7.1.0',
        '7.2': '7.2.0',
        '7.3': '7.3.0',
        '7.4': '7.4.0',
        '7.5': '7.5.0',
        '7.6': '7.6.0',
        '7.7': '7.7.0',
        '7.8': '7.8.0',
        '7.9': '7.9.0',
        '8': '8.0.0',
        '8.0': '8.0.0',
        '8.1': '8.1.0',
        '8.x': '8.1.0',
        '8.latest': '8.1.0',
        'latest': '8.1.0'
    },
    modern: {
        '6': '6.0.2',
        '6.0': '6.0.2',
        '6.2': '6.2.1',
        '6.5': '6.5.3',
        '6.6': '6.6.0',
        '6.7': '6.7.0',
        '6.x': '6.7.0',
        '6.latest': '6.7.0',
        '7': '7.0.0',
        '7.0': '7.0.0',
        '7.1': '7.1.0',
        '7.2': '7.2.0',
        '7.3': '7.3.0',
        '7.4': '7.4.0',
        '7.5': '7.5.0',
        '7.6': '7.6.0',
        '7.7': '7.7.0',
        '7.8': '7.8.0',
        '7.9': '7.9.0',
        '8': '8.0.0',
        '8.0': '8.0.0',
        '8.1': '8.1.0',
        '8.x': '8.1.0',
        '8.latest': '8.1.0',
        'latest': '8.1.0'
    }
};

const doxi = {
    classic: {},
    modern: {}
};

function createLookupMaps () {
    let toolkit, ver;

    for (toolkit in doxi) {
        if (Object.prototype.hasOwnProperty.call(doxi, toolkit)) {
            for (ver in doxi[toolkit]) {
                if (Object.prototype.hasOwnProperty.call(doxi[toolkit], ver)) {
                    // only create the map objects if they do not already exist
                    if (!doxi[toolkit][ver].classNamesMap) {
                        doxi[toolkit][ver].classNamesMap = {};
                        doxi[toolkit][ver].alternateClassNamesMap = {};
                        doxi[toolkit][ver].aliasMap = {};
                        const doxiItems = doxi[toolkit][ver].global.items;
                        const doxiItemsLen = doxiItems.length;
            
                        for (let i = 0; i < doxiItemsLen; i++) {
                            const alias = doxiItems[i].alias;
                            const alternateClassNames = doxiItems[i].alternateClassNames;
            
                            // add the Class name to the classNamesMape
                            doxi[toolkit][ver].classNamesMap[doxiItems[i].name] = doxiItems[i].name;
            
                            // add the alias names to the aliasMap
                            if (alias) {
                                const aliasArray = alias.split(',');
                                for (let j = 0; j < aliasArray.length; j++) {
                                    doxi[toolkit][ver].aliasMap[aliasArray[j]] = doxiItems[i].name;
                                }
                            }
            
                            // add the alternate class names to the alternateClassNamesMap
                            if (alternateClassNames) {
                                const alternateClassNamesArray = alternateClassNames.split(',');
                                for (let j = 0; j < alternateClassNamesArray.length; j++) {
                                    doxi[toolkit][ver].alternateClassNamesMap[alternateClassNamesArray[j]] = doxiItems[i].name;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function init (context) {
    this.userExtjsSettings = context.settings.extjs || {};
    this.extjsSettings = Object.assign({}, extjsDefaultSettings, context.settings.extjs);
    this.loadDoxiData();
}

function isValidDoxiVersion (version) {
    const toolkit = this.extjsSettings.toolkit;
    let doxiVersion;

    if (doxiVersionsMap[toolkit] && version && version.toString) {
        version = version.toString();
        doxiVersion = doxiVersionsMap[toolkit][version.split('.').slice(0, 2).join('.')];
    }
    return doxiVersion;
}

function getDoxiVersion (version) {
    const toolkit = this.extjsSettings.toolkit;
    let doxiVersion;

    if (doxiVersionsMap[toolkit] && version && version.toString) {
        version = version.toString();
        doxiVersion = doxiVersionsMap[toolkit][version.split('.').slice(0, 2).join('.')];
    }
    return doxiVersion || this.getDoxiLatestMinorVersion(version) || this.getDoxiLatestVersion();
}

function getDoxiLatestVersion () {
    const toolkit = this.extjsSettings.toolkit;
    let doxiVersion;

    if (doxiVersionsMap[toolkit]) {
        doxiVersion = doxiVersionsMap[toolkit].latest;
    }
    return doxiVersion;
}

function getDoxiLatestMinorVersion (version) {
    const toolkit = this.extjsSettings.toolkit;
    let doxiVersion;
    let majorVersion;

    if (doxiVersionsMap[toolkit] && version && version.toString) {
        version = version.toString();
        majorVersion = version.split('.').slice(0, 1).join('.');
        doxiVersion = doxiVersionsMap[toolkit][`${majorVersion}.latest`];
    }
    return doxiVersion;
}

function getDoxiData(version) {
    const toolkit = this.extjsSettings.toolkit;
    let doxiData;

    if (doxiVersionsMap[toolkit] && this.isValidDoxiVersion(version)) {
        doxiData = doxi[toolkit][this.getDoxiVersion(version)];
    }
    if (doxiData) {
        return doxiData;
    } else {
        return this.loadDoxiData(version);
    }
}

function loadDoxiData (version) {
    let fileContents;
    const userExtjsSettings = this.userExtjsSettings;
    const extjsSettings = this.extjsSettings;
    const toolkit = extjsSettings.toolkit;
    const fromVersion = this.getDoxiVersion(version || extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(version || extjsSettings.toVersion || extjsSettings.version);

    if (fromVersion && this.isValidDoxiVersion(fromVersion)) {
        // only load again if not already loaded
        if (!doxi[toolkit][fromVersion]) {
            if (typeof userExtjsSettings.fromVersion !== 'undefined') {
                if (!version) {
                    console.log(`fromVersion requested: ${toolkit} - ${userExtjsSettings.fromVersion}, loading nearest doxi json for ${fromVersion}`);
                }
            } else if (typeof userExtjsSettings.version !== 'undefined') {
                if (!version) {
                    console.log(`version requested: ${toolkit} - ${userExtjsSettings.version}, loading nearest doxi json for ${fromVersion}`);
                }
            }
            try {
                fileContents = fs.readFileSync(path.resolve(__dirname, `../doxi/extjs/${fromVersion}/all-classes/${toolkit}_all-classes.json`));
                doxi[toolkit][fromVersion] = JSON.parse(fileContents);
            } catch (error) {
                console.error('Error reading the doxi file');
            }
        }
    } else {
        console.log(`Invalid Ext JS fromVersion ${fromVersion}`);
    }

    if (toVersion && this.isValidDoxiVersion(toVersion)) {
        // only load again if not already loaded
        if (!doxi[toolkit][toVersion]) {
            if (typeof userExtjsSettings.toVersion !== 'undefined') {
                if (!version) {
                    console.log(`toVersion requested: ${toolkit} - ${userExtjsSettings.toVersion}, loading nearest doxi json for ${toVersion}`);
                }
            } else if (typeof userExtjsSettings.version !== 'undefined') {
                if (!version) {
                    console.log(`version requested: ${toolkit} - ${userExtjsSettings.version}, loading nearest doxi json for ${toVersion}`);
                }
            }
            try {
                fileContents = fs.readFileSync(path.resolve(__dirname, `../doxi/extjs/${toVersion}/all-classes/${toolkit}_all-classes.json`));
                doxi[toolkit][toVersion] = JSON.parse(fileContents);
            } catch (error) {
                console.error('Error reading the doxi file');
            }
        }
    } else {
        console.log(`Invalid Ext JS toVersion ${toVersion}`);
    }

    // after loading the data, we need to create the maps
    createLookupMaps();

    // finally, if a version was passed in,
    // then this was a dynamic lookup/load
    // and so we need to return the data
    if (version && this.isValidDoxiVersion(version)) {
        return doxi[toolkit][version];
    } else {
        return null;
    }
}

function isExtObject (node) {
    return node.callee.property &&
        (
            node.callee.property.name === 'Ext' ||
            node.callee.property.value === 'Ext'
        );
}

function isExtExtend (node) {
    let retVal = false;

    if (node && node.callee && node.callee.object && node.callee.property) {
        retVal = (node.callee.object.name === 'Ext' && node.callee.property.name === 'extend') ? true : false;
    }
    return retVal;
}

function isExtOverride (node) {
    let retVal = false;

    if (node && node.callee && node.callee.object && node.callee.property) {
        retVal = (node.callee.object.name === 'Ext' && node.callee.property.name === 'override') ? true : false;
    }
    return retVal;
}

function isExtDefine (node) {
    let retVal = false;

    if (node && node.callee && node.callee.object && node.callee.property) {
        retVal = (node.callee.object.name === 'Ext' && node.callee.property.name === 'define') ? true : false;
    }
    return retVal;
}

function isExtCreate (node) {
    let retVal = false;

    if (node && node.callee && node.callee.object && node.callee.property) {
        retVal = (node.callee.object.name === 'Ext' && node.callee.property.name === 'create') ? true : false;
    }
    return retVal;
}

function isObjectOfExtDefine (node) {
    let retVal = false;

    if (!utils.isProgram(node) && node.parent.callee && node.parent.callee.object && node.parent.callee.property) {
        retVal = (utils.isObjectExpression(node) && node.parent.callee.object.name === 'Ext' && node.parent.callee.property.name === 'define') ? true : false;
    }
    return retVal;
}

function isUnderExtDefine (node) {
    return Boolean(utils.getParent(node, isExtDefine));
}

function getExtDefineObject (node) {
    return utils.getParent(node, isObjectOfExtDefine);
}

function getExtExtendCall (node) {
    return utils.getParent(node, isExtExtend);
}

function getExtOverrideCall (node) {
    return utils.getParent(node, isExtOverride);
}

function getExtDefineCall (node) {
    return utils.getParent(node, isExtDefine);
}

function isPropertyAssignment (node) {
    if (node.parent.type === 'ObjectExpression' && node.parent.parent.type === 'Property' && node.parent.parent.key.type === 'Identifier') {
        return true;
    } else {
        return false;
    }
}

function isListenerProperty (node) {
    if (node.parent.type === 'ObjectExpression' && node.parent.parent.type === 'Property' && node.parent.parent.key.name === 'listeners') {
        return true;
    } else {
        return false;
    }
}

function isListenerCallExpression (node) {
    let retVal = false;

    if (node && node.callee && node.callee.object && node.callee.property) {
        retVal = (node.callee.property.name === 'on' || node.callee.property.name === 'mon') || node.callee.property.name === 'addListener' ? true : false;
    }
    return retVal;
}
function getOverridePropertyName (node) {
    const cls = utils.getParent(node, isExtDefine);

    if (cls) {
        return cls.name;
    } else {
        return null;
    }
}

function isOverrideProperty (node) {
    let retVal = false;

    if (node.type === 'Property') {
        retVal = node.key.name === 'override' && node.value.type === 'Literal';
    }
    return retVal;
}

function isSubClass (className, parentClassName, version) {
    const doxiClass = this.getDoxiClassByName(className, version || this.extjsSettings.fromVersion || this.extjsSettings.toVersion);

    if (doxiClass && doxiClass.extended) {
        const extended = doxiClass.extended.split(',');

        return extended.find(extendClassName => extendClassName === parentClassName);
    } else {
        return false;
    }
}

function isOverriddenExtClass (node) {
    const obj = this.getExtDefineObject(node);
    return obj && obj.properties.find(o => o.key && o.key.name === 'override');
}

function getOverriddenClassName (node, traverseToRoot) {
    if (traverseToRoot || 
        this.isExtDefine(node.parent.parent) ||
        this.isExtOverride(node.parent.parent) ||
        (utils.isMemberExpression(node) && (utils.isThisExpression(node.object) || utils.isIdentifierThisExpression(node.object)))
    ) {
        let obj = this.getExtDefineObject(node);
        const overrideClsNode = obj && obj.properties.find(o => o.key && o.key.name === 'override');
        let className = overrideClsNode && overrideClsNode.value.value;

        if (className) {
            return className;
        } else {
            // might be dealing with the Ext.override(...) call
            obj = this.getExtOverrideCall(node);
            const args = obj && obj.arguments;
            if (Array.isArray(args)) {
                className = utils.getFullyQualifiedMemberName(args[0]);
            }
            if (className) {
                return className;
            } else {
                return null;
            }
        }
    } else {
        return null;
    }
}

function isExtendedExtClass (node) {
    const obj = this.getExtDefineObject(node);
    return obj && obj.properties.find(o => o.key && o.key.name === 'extend');
}

function getExtendedClassName (node, traverseToRoot) {
    if (traverseToRoot || 
        (node.parent && node.parent.parent && (this.isExtDefine(node.parent.parent) || this.isExtExtend(node.parent.parent))) ||
        (utils.isMemberExpression(node) && (utils.isThisExpression(node.object) || utils.isIdentifierThisExpression(node.object)))
    ) {
        let obj = this.getExtDefineObject(node);
        const extendedClsNode = obj && obj.properties.find(o => o.key && o.key.name === 'extend');
        let className = extendedClsNode && extendedClsNode.value.value;
    
        if (className) {
            return className;
        } else {
            // might be dealing with the deprecated Ext.extend(...) call
            obj = this.getExtExtendCall(node);
            const args = obj && obj.arguments;
            if (Array.isArray(args)) {
                className = utils.getFullyQualifiedMemberName(args[0]);
            }
            if (className) {
                return className;
            } else {
                return null;
            }
        }
    } else {
        return null;
    }
}

function isExtComponentSubClass (className, version) {
    return this.isSubClass(className, 'Ext.Component', version);
}

function isExtComponentTemplateMethod (className, methodName) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    let doxiItem;

    if (this.isExtComponentSubClass(className, toVersion)) {
        doxiItem = this.getDoxiClassMethod('Ext.Component', methodName, toVersion);
    }

    // check the fromVersion if needed 
    if (!doxiItem && (fromVersion !== toVersion)) {
        if (this.isExtComponentSubClass(className, fromVersion)) {
            doxiItem = this.getDoxiClassMethod('Ext.Component', methodName, fromVersion);
        }
    }

    // if still not found, check the latest minor version of the current fromVersion being checked
    if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
        if (this.isExtComponentSubClass(className, fromVersion_LatestMinor)) {
            doxiItem = this.getDoxiClassMethod('Ext.Component', methodName, fromVersion_LatestMinor);
        }
    }

    return doxiItem && doxiItem.template;
}

function getClassNameFromExtCreate (node, version) {
    let xtypeName,
        doxiClass,
        className,
        callExpressionNode;

    // Ext.create() was the node passed in
    if (utils.isCallExpression(node)) {
        callExpressionNode = node;
    }
    // The VariableDeclarator was passed in
    // e.g. var classInstance = Ext.create();
    else if (node.type === 'VariableDeclarator' && utils.isCallExpression(node.init)) {
        callExpressionNode = node.init;
    }
    // examining Property nodes within an Ext.create() call
    // e.g
    // Ext.create({
    //     prop1: true,
    //     prop2: false
    // });
    else if (node.parent && node.parent.parent && utils.isCallExpression(node.parent.parent)) {
        callExpressionNode = node.parent.parent;
    }

    if (callExpressionNode) {
        const parsedCallee = utils.parseCallee(callExpressionNode);
        const callingMethod = parsedCallee && parsedCallee.join('.');

        // handle Ext.create, Ext.createByAlias, Ext.widget, Ext.createWidget
        if (callingMethod === 'Ext.create' || callingMethod === 'Ext.createByAlias' || callingMethod === 'Ext.widget' || callingMethod === 'Ext.createWidget') {
            const args = callExpressionNode.arguments;
            if (Array.isArray(args)) {
                if (utils.isLiteral(args[0])) {
                    xtypeName = args[0].value; // could be an xtype or an actual class name
                } else if (utils.isIdentifier(args[0])) {
                    xtypeName = utils.getIdentifierValue(args[0]);
                } else if (utils.isObjectExpression(args[0])) {
                    xtypeName = this.getXTypeName(args[0]);
                }
                if (xtypeName) {
                    doxiClass = this.getDoxiClassByXTypeName(xtypeName, version);
                    if (doxiClass) {
                        className = doxiClass.name;
                    } else {
                        className = xtypeName;
                    }
                } else if (utils.isObjectExpression(args[0])) {
                    className = this.getXClassName(args[0]);
                }
            }
        }
    }

    return className;
}

function getClassName (node, version) {
    return this.getExtendedClassName(node) || this.getOverriddenClassName(node) || this.getClassNameFromExtCreate(node, version);
}

function getExtClassDefinition (node, version) {
    let classObject;
    let className;
    let xtypeName;

    // handle properties within an object (e.g. { xtype: 'abc' }, { extend: 'xyz' })
    if (utils.isProperty(node)) {
        // xtype
        if (node.key && node.key.name && node.key.name === 'xtype') {
            if (utils.isLiteral(node.value)) {
                xtypeName = node.value.value;
            } else if (utils.isIdentifier(node.value)) {
                xtypeName = utils.getIdentifierValue(node.value);
            }
            if (xtypeName) {
                classObject = this.getDoxiClassByXTypeName(xtypeName, version);
            }
            if (!classObject) {
                className = this.getOverriddenClassName(node);
                if (!className) {
                    className = this.getExtendedClassName(node);
                }
                if (className && className.indexOf && className.indexOf('Ext') === 0) {
                    classObject = this.getDoxiClassByName(className, version);
                }
            } 
        }
        // xclass or extend or override
        if (node.key && node.key.name && 
            (node.key.name === 'xclass' || node.key.name === 'extend' || node.key.name === 'override')) {
            className = node.value.value;
            if (className) {
                classObject = this.getDoxiClassByName(className, version);
            }
        }
    }

    // handle call expressions and new expressions
    //   new Ext.form.field.TriggerField();
    //   Ext.form.field.TriggerField.apply()
    if (utils.isCallExpression(node) || utils.isNewExpression(node)) {
        className = utils.getCalleeName(node);
        if (className) {
            classObject = this.getDoxiClassByName(className, version);
        }
    }

    // handle the Ext.create(), Ext.createByAlias(), Ext.widget() and Ext.createWidget() calls along with any other Ext.* member experssions
    // but make sure NOT to handle this if the parent node is a NewExpression since that is handled earlier
    if (utils.isMemberExpression(node) && !utils.isNewExpression(node.parent)) {
        const nodeObjectName = node.object && node.object.name;
        const nodePropertyName = node.property && node.property.name;

        // special handling of Ext.create(), Ext.createByAlias(), Ext.widget() and Ext.createWidget
        if (nodeObjectName === 'Ext' && 
            (nodePropertyName === 'create' || nodePropertyName === 'createByAlias' || nodePropertyName === 'widget' || nodePropertyName === 'createWidget')) {
            const args = node.parent.arguments;

            // only deal with the format where the first argument is a string/identifier(variable) that represents the alias or class
            // we DO not worry about the format where only one argument is passed that is an object since that
            // is handled above in the utils.isProperty(node) block
            if (Array.isArray(args)) {
                if (utils.isLiteral(args[0])) {
                    xtypeName = args[0].value; // could be an xtype or an actual class name
                } else if (utils.isIdentifier(args[0])) {
                    xtypeName = utils.getIdentifierValue(args[0]);
                }
            }
            if (xtypeName) {
                classObject = this.getDoxiClassByXTypeName(xtypeName, version) || this.getDoxiClassByName(xtypeName, version);
            }
        }
        // handle all other Ext.* member expresions
        else {
            const fullyQualifiedClassName = utils.getFullyQualifiedMemberName(node);
            classObject = this.getDoxiClassByName(fullyQualifiedClassName, version);
        }
    }

    return classObject;
}

function getExtClassConfig (node, version, includeUndocumented) {
    let obj,
        configName,
        doxiClass,
        className,
        xtypeName,
        parsedCallee,
        callingMethod,
        nearestCallExpression;

    /**
     * // ORIGINAL
     * items: [
     * {
     *    xtype: 'component',
     *    autoLoad: 'page.html'
     *  },
     *  {
     *    xtype: 'component',
     *    autoLoad: {
     *      url: 'page.html',
     *      autoLoad: true
     *    }
     *  }
     * ]
     *
     * // AFTER FIX
     * items: [
     * {
     *    xtype: 'component',
     *    loader: {
     *      url: 'page.html'
     *    }
     *  },
     *  {
     *    xtype: 'component',
     *    loader: {
     *      url: 'page.html',
     *      autoLoad: true
     *    }
     *  }
     * ]
     */
    if (utils.isProperty(node) && utils.isObjectExpression(node.parent) /* && utils.isArrayExpression(node.parent.parent) */) {
        configName = node.key.name;
        nearestCallExpression = utils.getParent(node, utils.isCallExpression);
        xtypeName = this.getXTypeName(node);

        if (node.parent.parent && utils.isNewExpression(node.parent.parent)) {
            parsedCallee = utils.parseCallee(node.parent.parent);
            className = parsedCallee && parsedCallee.join('.');
        }
        else if (node.parent.parent && utils.isCallExpression(node.parent.parent)) {
            parsedCallee = utils.parseCallee(node.parent.parent);
            callingMethod = parsedCallee && parsedCallee.join('.');

            // handle Ext.create, Ext.createByAlias, Ext.widget, Ext.createWidget
            if (callingMethod === 'Ext.create' || callingMethod === 'Ext.createByAlias' || callingMethod === 'Ext.widget' || callingMethod === 'Ext.createWidget') {
                const args = node.parent.parent.arguments;
                if (Array.isArray(args)) {
                    if (utils.isLiteral(args[0])) {
                        xtypeName = args[0].value; // could be an xtype or an actual class name
                    } else if (utils.isObjectExpression(args[0])) {
                        xtypeName = this.getXTypeName(args[0]);
                    }
                    if (xtypeName) {
                        doxiClass = this.getDoxiClassByXTypeName(xtypeName, version);
                        if (doxiClass) {
                            className = doxiClass.name;
                        } else {
                            className = xtypeName;
                        }
                    } else if (utils.isObjectExpression(args[0])) {
                        className = this.getXClassName(args[0]);
                    }
                }
            }
        }

        if (!className) {
            // handle config in an xtype config object
            if (xtypeName) {
                doxiClass = this.getDoxiClassByXTypeName(xtypeName, version);
                if (doxiClass) {
                    className = doxiClass.name;
                }
            }
            // handle config defined on an extended class or override
            else if (!this.isPropertyAssignment(node) && !this.isListenerProperty(node) && !this.isListenerCallExpression(nearestCallExpression) && this.isExtDefine(nearestCallExpression)) {
                const overrideClassName = this.getOverriddenClassName(node);
                if (overrideClassName) {
                    className = overrideClassName;
                } else {
                    className = this.getExtendedClassName(node);
                }
            }
        }

        if (className) {
            obj = this.getDoxiClassConfig(className, configName, version, includeUndocumented);
        } else {
            className = this.getExtendedClassName(node, true) || this.getOverriddenClassName(node, true);
            // special handling for field configs in an Ext.data.Model derived class
            if (className === 'Ext.data.Model' && 
                (node.parent && node.parent.parent && utils.isArrayExpression(node.parent.parent)) && 
                (node.parent.parent.parent && utils.isProperty(node.parent.parent.parent) && node.parent.parent.parent.key.name === 'fields')
            ) {
                const fieldTypePropertyNode = node.parent.properties && node.parent.properties.find(o => o.key && o.key.name === 'type');
                if (fieldTypePropertyNode && utils.isLiteral(fieldTypePropertyNode.value)) {
                    let fieldTypeClassObject;
                    if (version.indexOf('4') === 0) {
                        fieldTypeClassObject = this.getDoxiClassByName('Ext.data.Field', version);
                    } else {
                        fieldTypeClassObject = this.getDoxiClassByAliasName(`data.field.${fieldTypePropertyNode.value.value}`, version);
                    }
                    if (fieldTypeClassObject) {
                        obj = this.getDoxiClassConfig(fieldTypeClassObject.name, configName, version, includeUndocumented);
                    }
                }
            }
        }
    }

    // TODO - remove?
    if (utils.isMemberExpression(node)) {
        configName = node.property.name;
        className = utils.getFullyQualifiedClassName(node);
        obj = this.getDoxiClassConfigByNode(node, version, includeUndocumented);

        // handle calls to Ext.someMethod(), or Ext.subclass.Class.someMethod()
        if (className && className.indexOf && className.indexOf('Ext') === 0) {
            obj = this.getDoxiClassConfig(className, configName, version, includeUndocumented);
        }
        // handle calls to this.someMethod()
        else if (utils.isThisExpression(node.object)) {
            obj = this.getDoxiClassConfigByNode(node, version, includeUndocumented);
        }
        // handle calls to someVar.someMethod(), where someVar is 'this' (e.g. var me = this; me.add();)
        else if (utils.isIdentifierThisExpression(node.object)) {
            obj = this.getDoxiClassConfigByNode(node, version, includeUndocumented);
        }
    }

    return obj;
}

function getExtClassMethod (node, version, includeUndocumented) {
    let obj,
        methodName,
        doxiClass,
        className,
        xtypeName,
        callee,
        parsedCallee,
        callingMethod,
        nearestCallExpression;

    /*
        // example of FunctionalExpression
        {
            someMethod: function () {
                return true
            }
        }
    */
    if (utils.isProperty(node) && utils.isFunctionExpression(node.value)) {
        methodName = node.key.name;
        nearestCallExpression = utils.getParent(node, utils.isCallExpression);

        // handle method defined on an extended class or override
        // but NOT in a listeners: {} block or a listeners .on() or .mon() call
        if (!this.isListenerProperty(node) &&
            nearestCallExpression &&
            !this.isListenerCallExpression(nearestCallExpression) &&
            (this.isExtDefine(nearestCallExpression) ||
                this.isExtExtend(nearestCallExpression) ||
                this.isExtCreate(nearestCallExpression) ||
                this.isExtOverride(nearestCallExpression))
        ) {
            parsedCallee = utils.parseCallee(node.parent.parent);
            callingMethod = parsedCallee && parsedCallee.join('.');

            // handle Ext.create, Ext.createByAlias, Ext.widget, Ext.createWidget
            if (callingMethod === 'Ext.create' || callingMethod === 'Ext.createByAlias' || callingMethod === 'Ext.widget' || callingMethod === 'Ext.createWidget') {
                const args = node.parent.parent.arguments;
                if (Array.isArray(args)) {
                    if (utils.isLiteral(args[0])) {
                        xtypeName = args[0].value; // could be an xtype or an actual class name
                    } else if (utils.isObjectExpression(args[0])) {
                        xtypeName = this.getXTypeName(args[0]);
                    }
                }
                if (xtypeName) {
                    doxiClass = this.getDoxiClassByXTypeName(xtypeName, version);
                    if (doxiClass) {
                        className = doxiClass.name;
                    } else {
                        className = xtypeName;
                    }
                } else if (utils.isObjectExpression(args[0])) {
                    className = this.getXClassName(args[0]);
                }
            } else {
                const overrideClassName = this.getOverriddenClassName(node);
                if (overrideClassName) {
                    className = overrideClassName;
                } else {
                    className = this.getExtendedClassName(node);
                }
            }
            if (className) {
                obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
            }
        }
    }

    /*
        // example of MemberExpression
        {
            someMethod: Ext.emptyFn
        }
    */
    if (utils.isProperty(node) && (utils.isMemberExpression(node.value) || utils.isConditionalExpression(node.value))) {
        methodName = node.key.name;

        className = this.getOverriddenClassName(node) || this.getExtendedClassName(node) || this.getClassNameFromExtCreate(node);
        if (className) {
            obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
        }
    }

    /*
        // example of Literal (or undefined identifier)
        {
            someMethod: Ext.emptyFn,
            someMethod2: null,
            someMethod3: 1, // should have been a method but developer accidentaly assigned a primitive
            someMethod4: undefined
        }
    */
    if (utils.isProperty(node) &&
        (utils.isLiteral(node.value) || (utils.isIdentifier(node.value) && node.value.name === 'undefined'))
    ) {
        methodName = node.key.name;

        if (methodName !== 'extend' && methodName !== 'override') {
            className = this.getClassName(node, version);
            if (className) {
                obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
            }
        }
    }

    /*
        handle CallExpressions like the following:
            - Ext.createWidget()
            - Ext.panel.Panel.add();
            - this.someMethod();
            - someVar.someMethod(); (where someVar is a ThisExpression)
            - Ext.create('panel', {}).addClass('abc');
    */
    if (utils.isMemberExpression(node) && utils.isCallExpression(node.parent)) {
        callee = node.parent.callee;
        methodName = node.property.name;
        className = utils.getFullyQualifiedClassName(node);

        // handle calls to Ext.someMethod(), or Ext.subclass.Class.someMethod()
        if (className && className.indexOf && className.indexOf('Ext') === 0) {
            obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
        }
        // handle calls to this.someMethod()
        else if (utils.isThisExpression(node.object)) {
            obj = this.getDoxiClassMethodByNode(node, version, includeUndocumented);
        }
        // handle calls to someVar.someMethod(), where someVar is 'this' (e.g. var me = this; me.add();)
        else if (utils.isIdentifierThisExpression(node.object)) {
            obj = this.getDoxiClassMethodByNode(node, version, includeUndocumented);
        }
        // handle chained calls; e.g. Ext.create('panel', {}).addClass('abc');
        else if (callee && callee.object && callee.object.callee && utils.isMemberExpression(callee.object.callee)) {
            const classDef = this.getExtClassDefinition(callee.object.callee);
            if (classDef && classDef.name) {
                obj = this.getDoxiClassMethod(classDef.name, methodName, version, includeUndocumented);
            }
        }
        // handle chained calls with a variable as the xtype/class; e.g. var xtypeName = 'panel'; Ext.create(xtypeName, {}).addClass('abc');
        else if (callee && callee.object && callee.object.callee && utils.isIdentifier(callee.object.callee)) {
            className = utils.getIdentifierValue(callee.object.callee);
            if (className) {
                obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
            }
        }
        // The MemberExpression we are working with may come from a VariableDeclaration
        // that is using "new Class()" or "Ext.create()"
        // var tool = new Ext.Tool(), tool2 = Ext.create({xclass: 'Ext.Too'});
        // tool.isPanelTool;
        // tool2.isPanelTool;
        else if (utils.isIdentifier(node.object)) {
            className = utils.getIdentifierValue(node.object);
            if (className && className.indexOf && className.indexOf('Ext') === 0) {
                obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
            }
            // if utils.getIdentifierValue() could not return a string for a className
            // then it will might return the VariableDeclarator node that we can then see
            // if that variable was a Ext.create() call and get the className from there
            else if (className && className.type === 'VariableDeclarator') {
                className = this.getClassNameFromExtCreate(className);
                if (className && className.indexOf && className.indexOf('Ext') === 0) {
                    obj = this.getDoxiClassMethod(className, methodName, version, includeUndocumented);
                }
            }
        }
    }

    return obj;
}

function getExtClassProperty (node, version, includeUndocumented) {
    let obj;
    let propertyName;
    let className;
    let nearestCallExpression;

    // a property in an object might be a config or a config that is also a property (e.g. Ext.data.Model.fields is both a config and a private property)
    if (utils.isProperty(node) && utils.isObjectExpression(node.parent) /* && utils.isLiteral(node.value) */) {
        propertyName = node.key.name;
        nearestCallExpression = utils.getParent(node, utils.isCallExpression);

        // handle method defined on an extended class or override
        if (propertyName !== 'extend' && propertyName !== 'override') {
            if (!this.isListenerProperty(node) && !this.isListenerCallExpression(nearestCallExpression) && this.isExtDefine(nearestCallExpression)) {
                const overrideClassName = this.getOverriddenClassName(node);
                if (overrideClassName) {
                    className = overrideClassName;
                } else {
                    className = this.getExtendedClassName(node);
                }
                obj = this.getDoxiClassProperty(className, propertyName, version, includeUndocumented);
            }
        }
    }

    /**
     * Testing 'fields' property
     *  var fields = this.fields;
     *  var len = this.fields.length;
     *  this.fields = []
     *  this.fields.concat([]);
     */
    if (utils.isMemberExpression(node) /** && (node.parent.type === 'AssignmentExpression' || node.parent.type === 'CallExpression') */) {
        propertyName = node.property.name;
        className = utils.getFullyQualifiedClassName(node);

        // handle calls to Ext.someProperty, or Ext.subclass.Class.someProperty
        if (className && className.indexOf && className.indexOf('Ext') === 0) {
            obj = this.getDoxiClassProperty(className, propertyName, version, includeUndocumented);
        }
        // handle calls to this.someProperty
        else if (utils.isThisExpression(node.object)) {
            obj = this.getDoxiClassPropertyByNode(node, version, includeUndocumented);
        }
        // handle calls to someVar.someProperty, where someVar is 'this' (e.g. var me = this; me.complete = true;)
        else if (utils.isIdentifierThisExpression(node.object)) {
            obj = this.getDoxiClassPropertyByNode(node, version, includeUndocumented);
        }
        // The MemberExpression we are working with may come from a VariableDeclaration
        // that is using "new Class()" or "Ext.create()"
        // var tool = new Ext.Tool(), tool2 = Ext.create({xclass: 'Ext.Too'});
        // tool.isPanelTool;
        // tool2.isPanelTool;
        else if (utils.isIdentifier(node.object)) {
            className = utils.getIdentifierValue(node.object);
            if (className && className.indexOf && className.indexOf('Ext') === 0) {
                obj = this.getDoxiClassProperty(className, propertyName, version, includeUndocumented);
            }
            // if utils.getIdentifierValue() could not return a string for a className
            // then it will might return the VariableDeclarator node that we can then see
            // if that variable was a Ext.create() call and get the className from there
            else if (className && className.type === 'VariableDeclarator') {
                className = this.getClassNameFromExtCreate(className);
                if (className && className.indexOf && className.indexOf('Ext') === 0) {
                    obj = this.getDoxiClassProperty(className, propertyName, version, includeUndocumented);
                }
            }
        }
    }

    return obj;
}

function cleanDeprecatedMessage (doxiItem) {
    if (doxiItem.deprecatedMessage) {
        return doxiItem.deprecatedMessage.replace(/[\t\n\r]/gm, ' '); // replace newlines and tabs with a single space
    } else if (doxiItem.text) {
        return doxiItem.text.replace(/[\t\n\r]/gm, ' '); // replace newlines and tabs with a single space
    } else {
        return '';
    }
}

function isDeprecatedClass (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    let foundOnVersion = toVersion;
    let doxiItem = this.getExtClassDefinition(node, toVersion); // check the toVersion first

    // check the fromVersion if needed 
    if (!doxiItem && (fromVersion !== toVersion)) {
        foundOnVersion = fromVersion;
        doxiItem = this.getExtClassDefinition(node, fromVersion);
    }

    // if still not found, check the latest minor version of the current fromVersion being checked
    // we do this since something could be deprecated at any major.minor version so the major.latest
    // version should at least give us the deprecated message we are looking for
    if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
        foundOnVersion = fromVersion_LatestMinor;
        doxiItem = this.getExtClassDefinition(node, foundOnVersion);
    }

    if (returnObject) {
        if (doxiItem && (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion)) {
            doxiItem.foundOnVersion = foundOnVersion;
            doxiItem.deprecatedMessage = cleanDeprecatedMessage(doxiItem);
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion) {
        return true;
    } else {
        return false;
    }
}

function getDeprecatedClass (node) {
    return this.isDeprecatedClass(node, true);
}

function isDeprecatedConfig (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    let foundOnVersion = toVersion;
    let doxiItem = this.getExtClassConfig(node, toVersion); // check the toVersion first

    // check the fromVersion if needed 
    if (!doxiItem && (fromVersion !== toVersion)) {
        foundOnVersion = fromVersion;
        doxiItem = this.getExtClassConfig(node, fromVersion);
    }

    // if still not found, check the latest minor version of the current fromVersion being checked
    // we do this since something could be deprecated at any major.minor version so the major.latest
    // version should at least give us the deprecated message we are looking for
    if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
        foundOnVersion = fromVersion_LatestMinor;
        doxiItem = this.getExtClassConfig(node, foundOnVersion);
    }

    // if still not found, search undocumented configs
    if (!doxiItem) {
        foundOnVersion = toVersion;
        doxiItem = this.getExtClassConfig(node, toVersion, true); // check the toVersion first

        // check the fromVersion if needed 
        if (!doxiItem && (fromVersion !== toVersion)) {
            foundOnVersion = fromVersion;
            doxiItem = this.getExtClassConfig(node, fromVersion, true);
        }

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
            foundOnVersion = fromVersion_LatestMinor;
            doxiItem = this.getExtClassConfig(node, foundOnVersion, true);
        }
    }

    if (returnObject) {
        if (doxiItem) {
            doxiItem.foundOnVersion = foundOnVersion;
            if (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion) {
                doxiItem.deprecatedMessage = cleanDeprecatedMessage(doxiItem);
                return doxiItem;
            }
            // special handling for Ext.data.Field#useNull that was never documented as deprecated after version 4.x
            // in this case, we need to add in the missing deprecatedMessage
            else if (doxiItem.className === 'Ext.data.Field' && doxiItem.name === 'useNull' && parseInt(this.getDoxiVersion(toVersion), 10) > 4) {
                doxiItem.deprecatedMessage = 'Use {@link #cfg!allowNull #allowNull} instead';
                return doxiItem;
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else if (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion) {
        return true;
    } else {
        return false;
    }
}

function getDeprecatedConfig (node) {
    return this.isDeprecatedConfig(node, true);
}

function isDeprecatedMethod (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    let foundOnVersion = toVersion;
    let doxiItem = this.getExtClassMethod(node, toVersion); // check the toVersion first

    // check the fromVersion if needed 
    if (!doxiItem && (fromVersion !== toVersion)) {
        foundOnVersion = fromVersion;
        doxiItem = this.getExtClassMethod(node, fromVersion);
    }

    // if still not found, check the latest minor version of the current fromVersion being checked
    // we do this since something could be deprecated at any major.minor version so the major.latest
    // version should at least give us the deprecated message we are looking for
    if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
        foundOnVersion = fromVersion_LatestMinor;
        doxiItem = this.getExtClassMethod(node, foundOnVersion);
    }

    // if still not found, search undocumented methods
    if (!doxiItem) {
        foundOnVersion = toVersion;
        doxiItem = this.getExtClassMethod(node, toVersion, true); // check the toVersion first

        // check the fromVersion if needed 
        if (!doxiItem && (fromVersion !== toVersion)) {
            foundOnVersion = fromVersion;
            doxiItem = this.getExtClassMethod(node, fromVersion, true);
        }

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
            foundOnVersion = fromVersion_LatestMinor;
            doxiItem = this.getExtClassMethod(node, foundOnVersion, true);
        }
    }

    if (returnObject) {
        if (doxiItem && (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion)) {
            doxiItem.foundOnVersion = foundOnVersion;
            doxiItem.deprecatedMessage = cleanDeprecatedMessage(doxiItem);
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion) {
        return true;
    } else {
        return false;
    }
}

function getDeprecatedMethod (node) {
    return this.isDeprecatedMethod(node, true);
}

function isDeprecatedProperty (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    let foundOnVersion = toVersion;
    let doxiItem = this.getExtClassProperty(node, toVersion); // check the toVersion first

    // check the fromVersion if needed 
    if (!doxiItem && (fromVersion !== toVersion)) {
        foundOnVersion = fromVersion;
        doxiItem = this.getExtClassProperty(node, fromVersion);
    }

    // if still not found, check the latest minor version of the current fromVersion being checked
    // we do this since something could be deprecated at any major.minor version so the major.latest
    // version should at least give us the deprecated message we are looking for
    if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
        foundOnVersion = fromVersion_LatestMinor;
        doxiItem = this.getExtClassProperty(node, foundOnVersion);
    }

    // if still not found, search undocumented properties
    if (!doxiItem) {
        foundOnVersion = toVersion;
        doxiItem = this.getExtClassProperty(node, toVersion, true); // check the toVersion first

        // check the fromVersion if needed 
        if (!doxiItem && (fromVersion !== toVersion)) {
            foundOnVersion = fromVersion;
            doxiItem = this.getExtClassProperty(node, fromVersion, true);
        }

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!doxiItem && (fromVersion_LatestMinor !== fromVersion)) {
            foundOnVersion = fromVersion_LatestMinor;
            doxiItem = this.getExtClassProperty(node, foundOnVersion, true);
        }
    }

    if (returnObject) {
        if (doxiItem && (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion)) {
            doxiItem.foundOnVersion = foundOnVersion;
            doxiItem.deprecatedMessage = cleanDeprecatedMessage(doxiItem);
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem.deprecatedMessage || doxiItem.deprecatedVersion) {
        return true;
    } else {
        return false;
    }
}

function getDeprecatedProperty (node) {
    return this.isDeprecatedProperty(node, true);
}


function isExistingAlias (node, returnObject) {
    const aliasName = this.getAliasName(node);
    let doxiItem;

    if (aliasName) {
        doxiItem = this.getDoxiClassByAliasName(aliasName, this.extjsSettings.toVersion || this.extjsSettings.version || this.extjsSettings.fromVersion);
    }

    if (returnObject) {
        if (doxiItem) {
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem) {
        return true;
    } else {
        return false;
    }
}

function getExistingAlias (node) {
    return this.isExistingAlias(node, true);
}

function isExistingMethod (node, returnObject) {
    const version = this.extjsSettings.toVersion || this.extjsSettings.version || this.extjsSettings.fromVersion;
    let doxiItem = this.getExtClassMethod(node, version);

    // if not found, search undocumented methods
    if (!doxiItem) {
        doxiItem = this.getExtClassMethod(node, version, true);
    }

    if (returnObject) {
        if (doxiItem) {
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem) {
        return true;
    } else {
        return false;
    }
}

function getExistingMethod (node) {
    return this.isExistingMethod(node, true);
}

function isPrivateClass (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const doxiItem = this.getExtClassDefinition(node, toVersion);

    if (returnObject) {
        if (doxiItem && doxiItem.access === 'private') {
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem && doxiItem.access === 'private') {
        return true;
    } else {
        return false;
    }
}

function getPrivateClass (node) {
    return this.isPrivateClass(node, true);
}

function isPrivateConfig (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    let doxiItem = this.getExtClassConfig(node, toVersion);

    // if still not found, check the latest minor version of the current toVersion being checked
    if (!doxiItem && (toVersion_LatestMinor !== toVersion)) {
        doxiItem = this.getExtClassConfig(node, toVersion_LatestMinor);
    }

    // if still not found, search undocumented configs
    if (!doxiItem) {
        doxiItem = this.getExtClassConfig(node, toVersion, true);

        // if still not found, check the latest minor version of the current toVersion being checked
        if (!doxiItem && (toVersion_LatestMinor !== toVersion)) {
            doxiItem = this.getExtClassConfig(node, toVersion_LatestMinor, true);
        }
    }

    if (returnObject) {
        if (doxiItem && doxiItem.access === 'private') {
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem && doxiItem.access === 'private') {
        return true;
    } else {
        return false;
    }
}

function getPrivateConfig (node) {
    return this.isPrivateConfig(node, true);
}

function isPrivateMethod (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    let doxiItem = this.getExtClassMethod(node, toVersion); // check the toVersion first

    // if still not found, check the latest minor version of the current toVersion being checked
    if (!doxiItem && (toVersion_LatestMinor !== toVersion)) {
        doxiItem = this.getExtClassMethod(node, toVersion_LatestMinor);
    }

    // if still not found, search undocumented methods
    if (!doxiItem) {
        doxiItem = this.getExtClassMethod(node, toVersion, true);

        // if still not found, check the latest minor version of the current toVersion being checked
        if (!doxiItem && (toVersion_LatestMinor !== toVersion)) {
            doxiItem = this.getExtClassMethod(node, toVersion_LatestMinor, true);
        }
    }

    if (returnObject) {
        if (doxiItem && doxiItem.access === 'private') {
            return doxiItem;
        } else {
            return null;
        }
    } else if (doxiItem && doxiItem.access === 'private') {
        return true;
    } else {
        return false;
    }
}

function getPrivateMethod (node) {
    return this.isPrivateMethod(node, true);
}


function isPrivateProperty (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    // a property is sometimes also a config
    const doxiConfigItem = this.getExtClassConfig(node, toVersion);
    let doxiPropertyItem = this.getExtClassProperty(node, toVersion);

    // if a config was found in an object expression then we can bail
    // since the dev is using this as a config and not a property
    if (doxiConfigItem && utils.isObjectExpression(node.parent)) {
        return false;
    }

    // if still not found, check the latest minor version of the current toVersion being checked
    if (!doxiPropertyItem && (toVersion_LatestMinor !== toVersion)) {
        doxiPropertyItem = this.getExtClassProperty(node, toVersion_LatestMinor);
    }

    // if still not found, search undocumented methods
    if (!doxiPropertyItem) {
        doxiPropertyItem = this.getExtClassProperty(node, toVersion, true);

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!doxiPropertyItem && (toVersion_LatestMinor !== toVersion)) {
            doxiPropertyItem = this.getExtClassProperty(node, toVersion_LatestMinor, true);
        }
    }

    if (returnObject) {
        if (doxiPropertyItem && doxiPropertyItem.access === 'private') {
            return doxiPropertyItem;
        } else {
            return null;
        }
    } else if (doxiPropertyItem && doxiPropertyItem.access === 'private') {
        return true;
    } else {
        return false;
    }
}

function getPrivateProperty (node) {
    return this.isPrivateProperty(node, true);
}

function isRemovedClass (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    let objFrom = this.getExtClassDefinition(node, fromVersion);
    let objTo = (fromVersion === toVersion) ? objFrom : this.getExtClassDefinition(node, toVersion);

    // if objFrom not found, check the latest minor version of the current fromVersion being checked
    if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
        objFrom = this.getExtClassDefinition(node, fromVersion_LatestMinor, true);
    }

    // if objTo not found, check the latest minor version of the current toVersion being checked
    if (!objTo && (toVersion_LatestMinor !== toVersion)) {
        objTo = this.getExtClassDefinition(node, toVersion_LatestMinor, true);
    }

    if (returnObject) {
        // if the from version was found but not the to version
        // then return the from object
        if (objFrom && !objTo) {
            return objFrom;
        }
        // if both versions were found BUT the to version has a 'removedMessage'
        // then return the to version so the removedMessage can be included in the report
        else if (objFrom && objTo && objTo.removedMessage) {
            return objTo;
        }
        // if neither version was found then return null
        // since we have no way of knowing if perhaps this is a custom class
        else {
            return null;
        }
    } else if (objFrom && !objTo) {
        return true;
    } else {
        return false;
    }
}

function getRemovedClass (node) {
    return this.isRemovedClass(node, true);
}

function isRemovedConfig (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    let objFrom = this.getExtClassConfig(node, fromVersion);
    let objTo = (fromVersion === toVersion) ? objFrom : this.getExtClassConfig(node, toVersion);

    // if objFrom not found, check the latest minor version of the current fromVersion being checked
    if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
        objFrom = this.getExtClassConfig(node, fromVersion_LatestMinor);
    }

    // if objFrom still not found, search undocumented configs
    if (!objFrom) {
        objFrom = this.getExtClassConfig(node, fromVersion, true);

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
            objFrom = this.getExtClassConfig(node, fromVersion_LatestMinor, true);
        }
    }

    // if objTo not found, check the latest minor version of the current toVersion being checked
    if (!objTo && (toVersion_LatestMinor !== toVersion)) {
        objTo = this.getExtClassConfig(node, toVersion_LatestMinor);
    }

    // if objTo still not found, search undocumented configs
    if (!objTo) {
        objTo = this.getExtClassConfig(node, toVersion, true);

        // if still not found, check the latest minor version of the current toVersion being checked
        if (!objTo && (toVersion_LatestMinor !== toVersion)) {
            objTo = this.getExtClassConfig(node, toVersion_LatestMinor, true);
        }
    }

    if (returnObject) {
        // if the from version was found but not the to version
        // then return the from object
        if (objFrom && !objTo) {
            // special handling for the 'type' config of Ext.data.Field Class
            // for some reason this config is no longer documented correctly in Ext 5.x and 6.x
            if (objFrom.className === 'Ext.data.Field' && objFrom.name === 'type') {
                return null;
            } else {
                return objFrom;
            }
        }
        // if both versions were found BUT the to version has a 'removedMessage'
        // then return the to version so the removedMessage can be included in the report
        else if (objFrom && objTo && objTo.removedMessage) {
            return objTo;
        }
        // if neither version was found then return null
        // since we have no way of knowing if perhaps this is a custom config
        else {
            return null;
        }
    } else if (objFrom && !objTo) {
        return true;
    } else {
        return false;
    }
}

function getRemovedConfig (node) {
    return this.isRemovedConfig(node, true);
}

function isRemovedMethod (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    let objFrom = this.getExtClassMethod(node, fromVersion);
    let objTo = (fromVersion === toVersion) ? objFrom : this.getExtClassMethod(node, toVersion);

    // if objFrom not found, check the latest minor version of the current fromVersion being checked
    if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
        objFrom = this.getExtClassMethod(node, fromVersion_LatestMinor);
    }

    // if objFrom still not found, search undocumented methods
    if (!objFrom) {
        objFrom = this.getExtClassMethod(node, fromVersion, true);

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
            objFrom = this.getExtClassMethod(node, fromVersion_LatestMinor, true);
        }
    }

    // if objTo not found, check the latest minor version of the current toVersion being checked
    if (!objTo && (toVersion_LatestMinor !== toVersion)) {
        objTo = this.getExtClassMethod(node, toVersion_LatestMinor);
    }

    // if objTo not found, search undocumented methods
    if (!objTo) {
        objTo = this.getExtClassMethod(node, toVersion, true);

        // if still not found, check the latest minor version of the current toVersion being checked
        if (!objTo && (toVersion_LatestMinor !== toVersion)) {
            objTo = this.getExtClassMethod(node, toVersion_LatestMinor, true);
        }
    }

    if (returnObject) {
        // if the from version was found but not the to version
        // then return the from object
        if (objFrom && !objTo) {
            return objFrom;
        }
        // if both versions were found BUT the to version has a 'removedMessage'
        // then return the to version so the removedMessage can be included in the report
        else if (objFrom && objTo && objTo.removedMessage) {
            return objTo;
        }
        // SPECIAL 'addEvents' handling that is needed since doxi shows it as a deprecatedMethod
        // BUT it is actually removed!
        // TODO - enter a JIRA ticket for this
        else if (objFrom && objTo && objTo.name === 'addEvents') {
            return objTo;
        }
        // if neither version was found then return null
        // since we have no way of knowing if perhaps this is a custom method
        else {
            return null;
        }
    } else if (objFrom && !objTo) {
        return true;
    } else {
        return false;
    }
}

function getRemovedMethod (node) {
    return this.isRemovedMethod(node, true);
}

function isRemovedProperty (node, returnObject) {
    const extjsSettings = this.extjsSettings;
    const fromVersion = this.getDoxiVersion(extjsSettings.fromVersion || extjsSettings.version);
    const toVersion = this.getDoxiVersion(extjsSettings.toVersion || extjsSettings.version);
    const fromVersion_LatestMinor = this.getDoxiLatestMinorVersion(fromVersion);
    const toVersion_LatestMinor = this.getDoxiLatestMinorVersion(toVersion);
    let objFrom = this.getExtClassProperty(node, fromVersion);
    let objTo = (fromVersion === toVersion) ? objFrom : this.getExtClassProperty(node, toVersion);

    // if objFrom not found, check the latest minor version of the current fromVersion being checked
    if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
        objFrom = this.getExtClassProperty(node, fromVersion_LatestMinor);
    }

    // if objFrom still not found, search undocumented properties
    if (!objFrom) {
        objFrom = this.getExtClassProperty(node, fromVersion, true);

        // if still not found, check the latest minor version of the current fromVersion being checked
        if (!objFrom && (fromVersion_LatestMinor !== fromVersion)) {
            objFrom = this.getExtClassProperty(node, fromVersion_LatestMinor, true);
        }
    }
    
    // if objTo not found, check the latest minor version of the current toVersion being checked
    if (!objTo && (toVersion_LatestMinor !== toVersion)) {
        objTo = this.getExtClassProperty(node, toVersion_LatestMinor);
    }

    // if objTo not found, search undocumented methods
    if (!objTo) {
        objTo = this.getExtClassProperty(node, toVersion, true);

        // if still not found, check the latest minor version of the current toVersion being checked
        if (!objTo && (toVersion_LatestMinor !== toVersion)) {
            objTo = this.getExtClassProperty(node, toVersion_LatestMinor, true);
        }
    }

    if (returnObject) {
        // if the from version was found but not the to version
        // then return the from object
        if (objFrom && !objTo) {
            return objFrom;
        }
        // if both versions were found BUT the to version has a 'removedMessage'
        // then return the to version so the removedMessage can be included in the report
        else if (objFrom && objTo && objTo.removedMessage) {
            return objTo;
        }
        // if neither version was found then return null
        // since we have no way of knowing if perhaps this is a custom property
        else {
            return null;
        }
    } else if (objFrom && !objTo) {
        return true;
    } else {
        return false;
    }
}

function getRemovedProperty (node) {
    return this.isRemovedProperty(node, true);
}

function getXTypeName (node) {
    let xtypeNode,
        xtypeName = '';

    if (utils.isProperty(node) && utils.isObjectExpression(node.parent)) {
        if (node.key.name === 'xtype' || node.key.name === 'alias') {
            xtypeNode = node;
        } else if (!this.isExtDefine(node.parent.parent)) {
            xtypeNode = node.parent.properties.find(o => o.key && o.key.name === 'xtype');
            if (!xtypeNode) {
                xtypeNode = node.parent.properties.find(o => o.key && o.key.name === 'alias');
            }
        }
    } else if (utils.isObjectExpression(node)) {
        xtypeNode = node.properties.find(o => o.key && o.key.name === 'xtype');
        if (!xtypeNode) {
            xtypeNode = node.properties.find(o => o.key && o.key.name === 'alias');
        }
    }

    if (xtypeNode) {
        if (utils.isLiteral(xtypeNode.value)) {
            xtypeName = xtypeNode.value.value; // could be an xtype or an actual class name
        } else if (utils.isIdentifier(xtypeNode.value)) {
            xtypeName = utils.getIdentifierValue(xtypeNode.value);
        } 
    } else {
        // TODO - what if no alias/xtype given?  Need to find the 'defaultType'
    }

    if (xtypeName && xtypeName.indexOf && xtypeName.indexOf('widget.') === 0) {
        xtypeName = xtypeName.slice(7);
    }
    return xtypeName;
}

function getAliasName (node) {
    let aliasNode,
        aliasName = '';

    if (utils.isProperty(node) && utils.isObjectExpression(node.parent)) {
        if (node.key.name === 'xtype' || node.key.name === 'alias') {
            aliasNode = node;
        }
    }

    if (aliasNode) {
        if (utils.isLiteral(aliasNode.value)) {
            aliasName = aliasNode.value.value;
        } else if (utils.isIdentifier(aliasNode.value)) {
            aliasName = utils.getIdentifierValue(aliasNode.value);
        } 
    }

    // if xtype was passed, prepend 'widget.'
    if (aliasName && node.key.name === 'xtype') {
        aliasName = `widget.${aliasName}`;
    }
    return aliasName;
}

function getXClassName (node) {
    let xclassNode, xclassName;

    if (utils.isProperty(node) && utils.isObjectExpression(node.parent)) {
        if (node.key.name === 'xclass') {
            xclassNode = node;
        } else if (!this.isExtDefine(node.parent.parent)) {
            xclassNode = node.parent.properties.find(o => o.key && o.key.name === 'xclass');
        }
    } else if (utils.isObjectExpression(node)) {
        xclassNode = node.properties.find(o => o.key && o.key.name === 'xclass');
    }

    if (xclassNode) {
        if (utils.isLiteral(xclassNode.value)) {
            xclassName = xclassNode.value.value; // could be an xtype or an actual class name
        } else if (utils.isIdentifier(xclassNode.value)) {
            xclassName = utils.getIdentifierValue(xclassNode.value);
        } 
    } else {
        // TODO - what if no xclass given?  Need to find the 'defaultType'
    }

    return xclassName;
}

function getDoxiClassByName (className, version) {
    const doxiData = this.getDoxiData(this.getDoxiVersion(version || this.extjsSettings.version));
    const doxiItems = doxiData && doxiData.global && doxiData.global.items;
    let validClassName = doxiData && doxiData.classNamesMap[className];
    let doxiClass;

    if (className && doxiItems) {
        // first, try searching classes using the passed className (if it is valid)
        if (validClassName) {
            doxiClass = doxiItems.find(o => o.name === validClassName);
        }
        // if no class was found, check to see if a validClassName can be found in the alternate classes map
        if (!doxiClass) {
            validClassName = doxiData.alternateClassNamesMap[className];
            if (validClassName) {
                doxiClass = doxiItems.find(o => o.name === validClassName);
            }
        }
        return doxiClass;
    } else {
        return null;
    }
}

function getDoxiClassByOverride (className, version) {
    const doxiData = this.getDoxiData(this.getDoxiVersion(version || this.extjsSettings.version));
    const doxiItems = doxiData && doxiData.global && doxiData.global.items;
    let validClassName = doxiData && doxiData.classNamesMap[className];
    let doxiClass;

    if (className && doxiItems) {
        // first, try searching classes using the passed className (if it is valid)
        if (validClassName) {
            doxiClass = doxiItems.find(o => o.override === validClassName);
        }
        // if no class was found, check to see if a validClassName can be found in the alternate classes map
        if (!doxiClass) {
            validClassName = doxiData.alternateClassNamesMap[className];
            if (validClassName) {
                doxiClass = doxiItems.find(o => o.override === validClassName);
            }
        }
        return doxiClass;
    } else {
        return null;
    }
}

function getDoxiClassByXTypeName (xtypeName, version) {
    const doxiData = this.getDoxiData(this.getDoxiVersion(version || this.extjsSettings.version));
    const doxiItems = doxiData && doxiData.global && doxiData.global.items;

    if (xtypeName && doxiItems) {
        if (xtypeName.indexOf && xtypeName.indexOf('widget.') === 0) {
            return doxiItems.find(o => o.name === doxiData.aliasMap[`${xtypeName}`]);
        } else {
            return doxiItems.find(o => o.name === doxiData.aliasMap[`widget.${xtypeName}`]);
        }
    } else {
        return null;
    }
}

function getDoxiClassByAliasName (aliasName, version) {
    const doxiData = this.getDoxiData(this.getDoxiVersion(version || this.extjsSettings.version));
    const doxiItems = doxiData && doxiData.global && doxiData.global.items;

    if (aliasName && doxiItems) {
        return doxiItems.find(o => o.name === doxiData.aliasMap[`${aliasName}`]);
    } else {
        return null;
    }
}

function getDoxiClassByNode (node, version) {
    const objectName = node.object && node.object.name;
    if (utils.isMemberExpression(node) && objectName && objectName.indexOf && objectName.indexOf('Ext') === 0) {
        return this.getDoxiClassByName(node.object.name, version);
    }

    const overrideClassName = this.getOverriddenClassName(node);
    const extendedClassName = this.getExtendedClassName(node);
    return this.getDoxiClassByName(overrideClassName || extendedClassName, version);
}

// TODO in some cases (e.g. singleSelect for Ext.grid.Panel) we need to look through the class chain of the 'requires' config
function getDoxiClassItem (className, itemType, itemName, version, includeUndocumented) {
    const doxiClass = this.getDoxiClassByName(className, version);
    let doxiClassItems = doxiClass && doxiClass.items;
    let doxiClassTypeItems = doxiClassItems && doxiClassItems.find(o => o.$type === itemType);
    let doxiClassTypeItem = doxiClassTypeItems && doxiClassTypeItems.items.find(o => {
        const name = o.name;
        let match = false;
        if (name && name.toLowerCase && itemName && itemName.toLowerCase) {
            if (name.toLowerCase() === itemName.toLowerCase()) {
                if (o.undocumented && includeUndocumented) {
                    match = true;
                } else if (!o.undocumented) {
                    match = true;
                }
            }
        }
        return match;
    });
    let extended;
    let mixed;
    let doxiOverrideClass;

    // if the doxi item was not found, look to see if there is an override for this class and search it
    if (!doxiClassTypeItem) {
        doxiOverrideClass = this.getDoxiClassByOverride(className, version);
        doxiClassItems = doxiOverrideClass && doxiOverrideClass.items;
        doxiClassTypeItems = doxiClassItems && doxiClassItems.find(o => o.$type === itemType);
        doxiClassTypeItem = doxiClassTypeItems && doxiClassTypeItems.items.find(o => {
            const name = o.name;
            let match = false;
            if (name && name.toLowerCase && itemName && itemName.toLowerCase) {
                if (name.toLowerCase() === itemName.toLowerCase()) {
                    if (o.undocumented && includeUndocumented) {
                        match = true;
                    } else if (!o.undocumented) {
                        match = true;
                    }
                }
            }
            return match;
        });
    }

    // if we could not find the item defined on the immediate class or any class overrides,
    // try every class that this class was extended from
    if (doxiClass && !doxiClassTypeItem && doxiClass.extended) {
        extended = doxiClass.extended.split(',');

        extended.find(function (extendedClassName) {
            const doxiClass2 = this.getDoxiClassByName(extendedClassName, version);
            const doxiClassItems2 = doxiClass2 && doxiClass2.items;
            const doxiClassTypeItems2 = doxiClassItems2 && doxiClassItems2.find(o => o.$type === itemType);
            doxiClassTypeItem = doxiClassTypeItems2 && doxiClassTypeItems2.items.find(o => {
                const name = o.name;
                let match = false;
                if (name && name.toLowerCase && itemName && itemName.toLowerCase) {
                    if (name.toLowerCase() === itemName.toLowerCase()) {
                        if (o.undocumented && includeUndocumented) {
                            match = true;
                        } else if (!o.undocumented) {
                            match = true;
                        }
                    }
                }
                return match;
            });
            // if the doxi item was not found, look to see if there is an override for this class and search it
            if (!doxiClassTypeItem) {
                doxiOverrideClass = this.getDoxiClassByOverride(extendedClassName, version);
                doxiClassItems = doxiOverrideClass && doxiOverrideClass.items;
                doxiClassTypeItems = doxiClassItems && doxiClassItems.find(o => o.$type === itemType);
                doxiClassTypeItem = doxiClassTypeItems && doxiClassTypeItems.items.find(o => {
                    const name = o.name;
                    let match = false;
                    if (name && name.toLowerCase && itemName && itemName.toLowerCase) {
                        if (name.toLowerCase() === itemName.toLowerCase()) {
                            if (o.undocumented && includeUndocumented) {
                                match = true;
                            } else if (!o.undocumented) {
                                match = true;
                            }
                        }
                    }
                    return match;
                });
            }
            return doxiClassTypeItem; // stops once we find a doxiClassTypeItem
        }, this);
    }

    // if we could not find the item defined on the extended classes,
    // try every class that this class mixed in
    if (doxiClass && !doxiClassTypeItem && doxiClass.mixed) {
        mixed = doxiClass.mixed.split(',');

        mixed.find(function (mixedClassName) {
            const doxiClass2 = this.getDoxiClassByName(mixedClassName, version);
            const doxiClassItems2 = doxiClass2 && doxiClass2.items;
            const doxiClassTypeItems2 = doxiClassItems2 && doxiClassItems2.find(o => o.$type === itemType);
            doxiClassTypeItem = doxiClassTypeItems2 && doxiClassTypeItems2.items.find(o => {
                const name = o.name;
                let match = false;
                if (name && name.toLowerCase && itemName && itemName.toLowerCase) {
                    if (name.toLowerCase() === itemName.toLowerCase()) {
                        if (o.undocumented && includeUndocumented) {
                            match = true;
                        } else if (!o.undocumented) {
                            match = true;
                        }
                    }
                }
                return match;
            });
            // if the doxi item was not found, look to see if there is an override for this class and search it
            if (!doxiClassTypeItem) {
                doxiOverrideClass = this.getDoxiClassByOverride(mixedClassName, version);
                doxiClassItems = doxiOverrideClass && doxiOverrideClass.items;
                doxiClassTypeItems = doxiClassItems && doxiClassItems.find(o => o.$type === itemType);
                doxiClassTypeItem = doxiClassTypeItems && doxiClassTypeItems.items.find(o => {
                    const name = o.name;
                    let match = false;
                    if (name && name.toLowerCase && itemName && itemName.toLowerCase) {
                        if (name.toLowerCase() === itemName.toLowerCase()) {
                            if (o.undocumented && includeUndocumented) {
                                match = true;
                            } else if (!o.undocumented) {
                                match = true;
                            }
                        }
                    }
                    return match;
                });
            }
            return doxiClassTypeItem; // stops once we find a doxiClassTypeItem
        }, this);
    }

    if (doxiClassTypeItem) {
        return Object.assign(doxiClassTypeItem, { className: className });
    }
    return doxiClassTypeItem;
}

function getDoxiClassItemByNode (node, itemType, version, includeUndocumented) {
    let doxiClass = this.getDoxiClassByNode(node, version || this.extjsSettings.version);
    let name;
    let doxiClassItem;
    let extended;

    if (doxiClass) {
        if (utils.isCallExpression(node)) {
            name = node.callee.property ? node.callee.property.name : '';
        } else if (utils.isMemberExpression(node)) {
            name = node.property ? node.property.name : '';
        } else if (utils.isProperty(node)) {
            name = node.key.name;
        }

        if (name) {
            doxiClassItem = this.getDoxiClassItem(doxiClass.name, itemType, name, version || this.extjsSettings.version, includeUndocumented);

            // if we could not find the item defined on the immediate class,
            // try every class that this class was extended from
            if (!doxiClassItem && doxiClass.extended) {
                extended = doxiClass.extended.split(',');

                extended.find(function (extendedClassName) {
                    doxiClass = this.getDoxiClassByName(extendedClassName, version);
                    doxiClassItem = doxiClass && this.getDoxiClassItem(doxiClass.name, itemType, name, version, includeUndocumented);
                    return doxiClassItem; // stops once we find a doxiClassItem
                }, this);
            }
        }
    }
    return doxiClassItem;
}

function getDoxiClassMethod (className, methodName, version, includeUndocumented) {
    const methodNameLC = methodName && methodName.toLowerCase();
    let retVal = this.getDoxiClassItem(className, 'methods', methodName, version, includeUndocumented);
    let accessorMethod;
    
    // maybe we are dealing with a getter/setter of an accessor config, so check
    if (!retVal && methodNameLC && methodNameLC.indexOf) {
        if (methodNameLC.indexOf('get') === 0 || methodNameLC.indexOf('set') === 0) {
            accessorMethod = this.getDoxiClassItem(className, 'configs', methodNameLC.substring(3), version, includeUndocumented);
            if (accessorMethod && accessorMethod.accessor) {
                retVal = accessorMethod;
            }
        }
    }

    // if not a normal method or an accessor method, perhaps a static-method
    if (!retVal) {
        retVal = this.getDoxiClassItem(className, 'static-methods', methodName, version, includeUndocumented);
    }
    return retVal;
}

function getDoxiClassMethodByNode (node, version, includeUndocumented) {
    return this.getDoxiClassItemByNode(node, 'methods', version, includeUndocumented) ||
        this.getDoxiClassItemByNode(node, 'static-methods', version, includeUndocumented);
}

function getDoxiClassProperty (className, propertyName, version, includeUndocumented) {
    return this.getDoxiClassItem(className, 'properties', propertyName, version, includeUndocumented) ||
        this.getDoxiClassItem(className, 'static-properties', propertyName, version, includeUndocumented);
}

function getDoxiClassPropertyByNode (node, version, includeUndocumented) {
    return this.getDoxiClassItemByNode(node, 'properties', version, includeUndocumented) ||
        this.getDoxiClassItemByNode(node, 'static-properties', version, includeUndocumented);
}

function getDoxiClassConfig (className, configName, version, includeUndocumented) {
    return this.getDoxiClassItem(className, 'configs', configName, version, includeUndocumented);
}

function getDoxiClassConfigByNode (node, version, includeUndocumented) {
    return this.getDoxiClassItemByNode(node, 'configs', version, includeUndocumented);
}

// TODO - how can we make sure the replacement is correct?
// Should we have a 'whitelist' instead of parsing the deprecatedMessage?
function getDeprecatedItemReplacement (className, doxiItem, itemType) {
    const re = /(.*@link)(.*)(}.*)/; // parse the deprecatedMessage for what is between '@link' and '}'
    let deprecatedParts = doxiItem.deprecatedMessage && doxiItem.deprecatedMessage.replace(re, '$2').replace(/\s/, '');
    let deprecatedClassName;
    let deprecatedReplacementName = '';
    let deprecatedDoxiItem;

    if (deprecatedParts.includes('#')) {
        deprecatedParts = deprecatedParts.split('#');
    }
    else if (!deprecatedParts.includes('#') || !deprecatedParts.includes('!')) {
        deprecatedParts = ['', deprecatedParts];
    }

    if (deprecatedParts) {
        [deprecatedClassName, deprecatedReplacementName] = deprecatedParts;
    }

    if (!deprecatedClassName) {
        deprecatedClassName = className;
    }

    if (deprecatedReplacementName) {
        // strip out any leading 'method!', 'cfg!', etc and all characters after the first space
        deprecatedReplacementName = deprecatedReplacementName.split(' ').slice(0, 1)[0].split('!').pop();
        if (deprecatedReplacementName.includes('cfg-') || deprecatedReplacementName.includes('method-')) {
            deprecatedReplacementName = deprecatedReplacementName.split('-').pop();
        }

        if (deprecatedReplacementName.includes('`')) {
            deprecatedReplacementName = deprecatedReplacementName.split('`')[1].trim();
        }
    }

    if (deprecatedReplacementName) {
        // check the toVersion first in case the item is still deprecated
        deprecatedDoxiItem = this.getDoxiClassItem(deprecatedClassName, itemType, deprecatedReplacementName, this.extjsSettings.toVersion);
        if (!deprecatedDoxiItem) {
            // then check the fromVersion if needed
            deprecatedDoxiItem = this.getDoxiClassItem(deprecatedClassName, itemType, deprecatedReplacementName, this.extjsSettings.fromVersion);
        }
    }
    return deprecatedDoxiItem;
}

function getDeprecatedConfigReplacement (className, doxiItem) {
    return this.getDeprecatedItemReplacement(className, doxiItem, 'configs');
}

function getDeprecatedPropertyReplacement (className, doxiItem) {
    return this.getDeprecatedItemReplacement(className, doxiItem, 'properties');
}

function getDeprecatedMethodReplacement (className, doxiItem) {
    return this.getDeprecatedItemReplacement(className, doxiItem, 'methods');
}

function isArrayProp (node) {
    if (utils.isNewExpression(node.value)) {
        const parsedCallee = utils.parseCallee(node.value);
        return parsedCallee.pop() === 'A';
    }

    return utils.isArrayExpression(node.value);
}

function isObjectProp (node) {
    if (utils.isNewExpression(node.value)) {
        const parsedCallee = utils.parseCallee(node.value);
        return parsedCallee.pop() === 'Object';
    }

    return utils.isObjectExpression(node.value);
}

module.exports = {
    isValidDoxiVersion,
    getDoxiVersion,
    getDoxiLatestVersion,
    getDoxiLatestMinorVersion,
    init,
    loadDoxiData,
    getDoxiData,

    isExtObject,
    isExtExtend,
    isExtOverride,
    isExtDefine,
    isExtCreate,
    isUnderExtDefine,
    isOverrideProperty,
    isSubClass,

    isOverriddenExtClass,
    getOverriddenClassName,

    isExtendedExtClass,
    getExtendedClassName,

    isExtComponentSubClass,
    isExtComponentTemplateMethod,

    getClassName,
    getClassNameFromExtCreate,

    getXTypeName,
    getAliasName,
    getXClassName,
    getExtExtendCall,
    getExtOverrideCall,
    getExtDefineCall,
    isPropertyAssignment,
    isListenerProperty,
    isListenerCallExpression,

    getExtClassDefinition,
    getExtClassConfig,
    getExtClassMethod,
    getExtClassProperty,

    isDeprecatedClass,
    isDeprecatedConfig,
    isDeprecatedMethod,
    isDeprecatedProperty,

    getDeprecatedClass,
    getDeprecatedConfig,
    getDeprecatedMethod,
    getDeprecatedProperty,

    isExistingAlias,
    isExistingMethod,

    getExistingAlias,
    getExistingMethod,

    isPrivateClass,
    isPrivateConfig,
    isPrivateMethod,
    isPrivateProperty,

    getPrivateClass,
    getPrivateConfig,
    getPrivateMethod,
    getPrivateProperty,

    isRemovedClass,
    isRemovedConfig,
    isRemovedMethod,
    isRemovedProperty,

    getRemovedClass,
    getRemovedConfig,
    getRemovedMethod,
    getRemovedProperty,

    getExtDefineObject,
    getOverridePropertyName,
    isObjectOfExtDefine,

    getDoxiClassByXTypeName,
    getDoxiClassByAliasName,
    getDoxiClassByName,
    getDoxiClassByOverride,
    getDoxiClassByNode,
    getDoxiClassItem,
    getDoxiClassItemByNode,
    getDoxiClassMethod,
    getDoxiClassMethodByNode,
    getDoxiClassProperty,
    getDoxiClassPropertyByNode,
    getDoxiClassConfig,
    getDoxiClassConfigByNode,

    getDeprecatedItemReplacement,
    getDeprecatedConfigReplacement,
    getDeprecatedPropertyReplacement,
    getDeprecatedMethodReplacement,

    isArrayProp,
    isObjectProp
};
