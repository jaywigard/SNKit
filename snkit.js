var SNKit = (() => {
  return {
    version: "1.0.0",
    clearValue: (fieldName, callback) => {
      var targetWin = SNKit.getTargetWindow();
      targetWin.g_form.clearValue(fieldName);
      callback();
    },
    alphaSortDataObject: (propName, dataObj) => {
      return new Promise((resolve, reject) => {
        dataObj.sort((a, b) => {
          const nameA = a[propName].toUpperCase();
          const nameB = b[propName].toUpperCase();
          let comparison = 0;
          if (nameA > nameB) {
            comparison = 1;
          } else if (nameA < nameB) {
            comparison = -1;
          }
          return comparison;
        })
        resolve(dataObj)
      })
    },
    getParentTable: () => {
      var parentTable;
      return new Promise((resolve, reject) => {
        var parentTableSysId;
        var targetWin = SNKit.getTargetWindow();
        var gr = new targetWin.GlideRecord("sys_db_object");
        gr.addQuery("name", targetWin.g_form.tableName);
        gr.query((gr) => {
          gr.next();
          parentTableSysId = gr.super_class;
          var gr = new targetWin.GlideRecord("sys_db_object");
          gr.addQuery("sys_id", parentTableSysId);
          gr.query((gr) => {
            gr.next();
            var name = gr.name;
            resolve(gr.name);
          });
        });
      });
    },
    collectVariableMetadata: (variablesArray, nameMap, targetWin) => {
      var variableDetails = [];
      var hasVariableEditor = targetWin.g_form.prefixHandlers.variables ? true : false;
      variablesArray.forEach((variable, i) => {
        var varObj = {};
        varObj.fieldName = variablesArray[i].fieldName;
        for (let i = 0; i < nameMap.length; i++) {
          if (varObj.fieldName == nameMap[i].realName) {
            varObj.Name = nameMap[i].prettyName;
            varObj.label = nameMap[i].label;
            break;
          }
        }
        varObj.mandatory = variablesArray[i].mandatory;
        varObj.reference = variablesArray[i].reference;
        varObj.scope = variablesArray[i].scope;
        varObj.tableName = variablesArray[i].tableName;
        varObj.type = variablesArray[i].type;
        varObj.variableEditor = hasVariableEditor;
        
        //if this is a reference field, then we need to get the display value as well
        if (varObj.reference != "null" && hasVariableEditor)
          varObj.displayValue = targetWin.g_form.getDisplayBox("ni.VE" + varObj.fieldName).value;
        else if (varObj.reference != "null")
          varObj.displayValue = targetWin.g_form.getDisplayBox(varObj.fieldName).value;
        /**
         * Check if the variable is part of a variable editor.
         * If not, the value can be obtained using the fieldName
         */
        if (hasVariableEditor)
          varObj.currentValue = targetWin.g_form.getValue("ni.VE" + varObj.fieldName);
        else
          varObj.currentValue = targetWin.g_form.getValue(varObj.fieldName);
        variableDetails.push(varObj);
      });
      return variableDetails;
    },
    collectFieldMetadata: (fieldsArray, parentTable, targetWin) => {
      var fieldDetails = [];
      fieldsArray.forEach((field, i) => {
        var fieldDetailObj = {};
        fieldDetailObj.fieldName = fieldsArray[i].fieldName;
        fieldDetailObj.label = targetWin.g_form.getLabelOf(fieldsArray[i].fieldName);
        fieldDetailObj.isInherited = fieldsArray[i].isInherited;
        fieldDetailObj.mandatory = fieldsArray[i].mandatory;
        fieldDetailObj.reference = fieldsArray[i].reference;
        fieldDetailObj.scope = fieldsArray[i].scope;
        if (fieldsArray[i].isInherited) {
          fieldDetailObj.tableName = parentTable;
        } else {
          fieldDetailObj.tableName = fieldsArray[i].tableName;
        }
        if (fieldDetailObj.reference != "null")
          fieldDetailObj.displayValue = targetWin.g_form.getDisplayBox(fieldDetailObj.fieldName).value;
        fieldDetailObj.type = fieldsArray[i].type;
        fieldDetailObj.currentValue = targetWin.g_form.getValue(fieldDetailObj.fieldName);
        fieldDetails.push(fieldDetailObj);
      });
      return fieldDetails;
    },
    getFormFields: (targetWin, callback) => {
      var fieldDetails = [];
      var variableDetails = [];
      var fields = [];
      var variables = [];
      var formElements = targetWin.g_form.elements;
      var nameMapClone = targetWin.g_form.nameMap;
      //var hasVariableEditor = targetWin.g_form.prefixHandlers.variables ? true : false;
      //separate the fields and variables into separate arrays for catalog items
      formElements.forEach((elem, i) => {
        if (elem.tableName == "variable" && !elem.fieldName.startsWith("ni.")) {
          variables.push(elem);
        } else if (!elem.fieldName.startsWith("ni.")) {
          fields.push(elem);
        }
      });
      //collect the variable properties
      variableDetails = SNKit.collectVariableMetadata(variables, nameMapClone, targetWin);
      //collect the field properties
      var parentTable;
      SNKit.getParentTable().then((name) => {
        parentTable = name;
        fieldDetails = SNKit.collectFieldMetadata(fields, parentTable, targetWin);
        SNKit.alphaSortDataObject("fieldName", fieldDetails)
          .then(SNKit.alphaSortDataObject("Name", variableDetails))
          .then(callback({ fieldDetails: fieldDetails, variableDetails: variableDetails }));
      });
    },
    getFormProperties: (callback) => {
      var fieldDetails = [];
      var targetWin = SNKit.getTargetWindow();
      if (targetWin.hasOwnProperty("g_form")) {
        SNKit.getFormFields(targetWin, (data) => {
          fieldDetails = data;
          callback(fieldDetails);
        });
      }
    },
    enableDisableField: (fieldName, disable, callback) => {
      var targetWin = SNKit.getTargetWindow();
      targetWin.g_form.setDisabled(fieldName, disable);
      callback();
    },
    setRemoveMandatory: (fieldName, mandatory, callback) => {
      var targetWin = SNKit.getTargetWindow();
      targetWin.g_form.setMandatory(fieldName, mandatory);
      callback();
    },
    showHideField: (fieldName, show, callback) => {
      var targetWin = SNKit.getTargetWindow();
      targetWin.g_form.setDisplay(fieldName, show);
      callback();
    },
    showAllHiddenFields: (fieldDetails, callback) => {
      var targetWin = SNKit.getTargetWindow();
      var hasVariableEditor = targetWin.g_form.prefixHandlers.variables ? true : false;
      fieldDetails.forEach((field) => {
        if (field.name && hasVariableEditor) {
          targetWin.g_form.setDisplay(field.name, true);
        } else {
          targetWin.g_form.setDisplay(field.fieldName, true);
        }
      });
      callback();
    },
    showReference: (fieldName, callback) => {
      var targetWin = SNKit.getTargetWindow();
      targetWin.g_form.getReference(fieldName, (ref) => {
        console.info("%cReference record:", "color:green; font-size:large;");
        console.groupCollapsed(fieldName);
        ref.rows[0].forEach((fieldObj) => {
          console.log(`%c${fieldObj.name}%c: %c${fieldObj.value}`, "color:#881391;", "color:black;", "color:#c41a16");
        })
        console.groupEnd();
      })
      callback();
    },
    getTargetWindow: () => {
      var targetWin;
      if (window.g_form) {
        targetWin = window;
        return targetWin;
      } else if (document.getElementById('gsft_main')) {
        targetWin = document.getElementById('gsft_main').contentWindow
        return targetWin;
      } else {
        return window;
      }
    },
    getWidgetDetails: (callback) => {
      var details = [];
      var spWidgets = document.querySelectorAll("[widget='widget']");

      spWidgets.forEach((w, i) => {
        var detailObj = {};
        var thisScope = angular.element(spWidgets[i]).scope();
        detailObj.name = thisScope.widget.name;
        detailObj.technicalName = thisScope.widget.id;
        detailObj.className = spWidgets[i].classList.item(0);
        detailObj.identifier = "class"
        details.push(detailObj);
      })
      callback(details);
    },
    isServicePortalPage: (callback) => {
      callback(window.NOW.hasOwnProperty("sp"));
    },
    isFormPage: (callback) => {
      callback(SNKit.getTargetWindow().hasOwnProperty("g_form"));
    },
    isNotReadOnlyMode: (callback) => {
      //This will apply to the standard interface
      if (window.NOW.hasOwnProperty("user")) {
        if (window.NOW.user.hasOwnProperty("roles")) {
          callback(window.NOW.user.roles.search("snc_read_only") === -1);
        } else {
          callback(false);
        }
      } else if (window.NOW.hasOwnProperty("user_display_name")) {
        callback(window.NOW.user_display_name.search("snc_read_only") === -1);
      } else {
        callback(false);
      }
    },
    showUiPolicies: (fieldName, callback) => {
      var targetWindow = SNKit.getTargetWindow()
      var uiPolicyArray = targetWindow.g_ui_policy;
      var targetPolicies = [];
      uiPolicyArray.forEach((policy) => {
        policy.actions.forEach((action) => {
          if (action.name == fieldName) {
            var policyDetailObj = {};
            policyDetailObj.name = policy.short_description;
            policyDetailObj.url = `https://${targetWindow.location.hostname}/sys_ui_policy.do?sys_id=${policy.sys_id}`;
            targetPolicies.push(policyDetailObj);
          }
        })
      })
      callback(targetPolicies);
    },
    showClientScripts: (fieldName, callback) => {
      var targetWindow = SNKit.getTargetWindow()
      var clientScriptsObj = targetWindow.g_event_handler_ids;
      var targetClientScripts = [];
      var promises = [];
      for (var prop in clientScriptsObj) {
        var gr = new targetWindow.GlideRecord("sys_script_client");
        gr.addQuery("sys_id", clientScriptsObj[prop]);
        promises.push(new Promise((resolve, reject) => {
          gr.query(function (rec) {
            rec.next();
            if (rec.script.search(fieldName) != -1) {
              var scriptDetailObj = {};
              scriptDetailObj.name = rec.sys_name;
              scriptDetailObj.type = rec.type;
              scriptDetailObj.url = `https://${targetWindow.location.hostname}/sys_script_client.do?sys_id=${rec.sys_id}`;
              targetClientScripts.push(scriptDetailObj);
            }
            resolve();
          });
        }));
      }
      Promise.all(promises).then(() => { callback(targetClientScripts) });
    },
    showBusinessRules: (fieldName, callback) => {
      var targetWindow = SNKit.getTargetWindow()
      var targetBusinessRules = [];
      var gr = new targetWindow.GlideRecord("sys_script");
      gr.addQuery("collection", targetWindow.g_form.tableName);
      new Promise((resolve, reject) => {
        gr.query(function (rec) {
          while (rec.next()) {
            if (rec.script.search(fieldName) != -1 || rec.template.search(fieldName) != -1) {
              var scriptDetailObj = {};
              scriptDetailObj.name = rec.name;
              scriptDetailObj.when = rec.when;
              scriptDetailObj.for = [];
              if (rec.action_delete == "true") scriptDetailObj.for.push("Delete");
              if (rec.action_insert == "true") scriptDetailObj.for.push("Insert");
              if (rec.action_query == "true") scriptDetailObj.for.push("Query");
              if (rec.action_update == "true") scriptDetailObj.for.push("Update");
              scriptDetailObj.url = `https://${targetWindow.location.hostname}/sys_script.do?sys_id=${rec.sys_id}`;
              targetBusinessRules.push(scriptDetailObj);
            }
          }
          resolve();
        });
      }).then(() => { callback(targetBusinessRules) });
    }
  }
})();

var snkit_api = (() => {
  return {
    getWidgetScopes: (p1, p2) => {
      var _widgetName;
      var _callback;
      /**
       * Allow the user to either enter a string name of the widget, a string name of
       * the widget with a callback, or just a callback.
       */
      if(p1) {
        if(typeof(p1) === "string") {
          _widgetName = p1;
        } else if(typeof(p1) === "function") {
          _callback = p1;
        }
      }
      if(p2) {
        if(typeof(p2) === "function")
          _callback = p2;
      }

      var widgetScopes = [];
      var spWidgets = document.querySelectorAll("[widget='widget']");

      spWidgets.forEach((widget, i) => {
        var thisScope = angular.element(spWidgets[i]).scope();
        widgetScopes.push(thisScope);
      });

      if(_widgetName) {
        if (_callback) {
          var results = widgetScopes.filter((scope) => {
            return scope.widget.name.toUpperCase() == _widgetName.toUpperCase()
          });
          _callback(results);
          return;
        } else {
          return widgetScopes.filter((scope) => {
            return scope.widget.name.toUpperCase() == _widgetName.toUpperCase()
          });
        }
      }
      if(_callback) _callback(widgetScopes);
      else return widgetScopes;
    },
    createWidgetScopeObjects: () => {
      var widgetScopes = snkit_api.getWidgetScopes();
      var names = [];
      var duplicateWidgetCounter = {};
      widgetScopes.forEach((scope) => {
        var scriptableName = `$${scope.widget.name.toLowerCase()}`;
        scriptableName = scriptableName.split(" ").join("_");
        //check for duplicates and tag them with numbers
        if(names.indexOf(scriptableName) !== -1){
          if(duplicateWidgetCounter.hasOwnProperty(scriptableName)){
            duplicateWidgetCounter[scriptableName]++;
            scriptableName = scriptableName + duplicateWidgetCounter[scriptableName];
          } else {
            duplicateWidgetCounter[scriptableName] = 1;
            scriptableName = scriptableName + duplicateWidgetCounter[scriptableName];
          }
        } else {
          names.push(scriptableName);
        }
        snkit_api[scriptableName] = scope;
      });
    },
    createFormFieldsObjects: (fieldName) => {
      var targetWin = SNKit.getTargetWindow();
      var fields = [];
      var variables = [];
      var formElements = targetWin.g_form.elements;
      var nameMapClone = targetWin.g_form.nameMap;
      //var hasVariableEditor = targetWin.g_form.prefixHandlers.variables ? true : false;
      //separate the fields and variables into separate arrays for catalog items
      formElements.forEach((elem, i) => {
        if (elem.tableName == "variable" && !elem.fieldName.startsWith("ni.")) {
          variables.push(elem);
        } else if (!elem.fieldName.startsWith("ni.")) {
          fields.push(elem);
        }
      });
      //collect the field properties
      var parentTable;
      SNKit.getParentTable().then((name) => {
        parentTable = name;
        snkit_api.$fields = SNKit.collectFieldMetadata(fields, parentTable, targetWin);
      });
      //collect the variable properties
      snkit_api.$variables = SNKit.collectVariableMetadata(variables, nameMapClone, targetWin);
    },
    monitorField: (fieldName) => {
      console.log("api functions coming soon!");
    },
    monitorWidget: (widgetName) => {
      console.log("api functions coming soon!");
    },
  }
})();

/**
 * if this is a Service Portal page, add the widget scope objects to the snkit_api object.
 * if this is a form, add the form fields and variables to the snkit_api object
 */
setTimeout(() => {
  SNKit.isNotReadOnlyMode((result) => {
    if (result) {
      if (window.NOW.hasOwnProperty("sp")) {
        snkit_api.createWidgetScopeObjects();
      } else if (SNKit.getTargetWindow().hasOwnProperty("g_form")) {
        snkit_api.createFormFieldsObjects();
      }
    }
  });
}, 2000)
  
window.addEventListener("snkitRequest", function(event) {
  var cmd = event.detail.cmd;
  var cmdData = event.detail.cmdData;
  if (cmd === "getFormProperties"){
    SNKit.getFormProperties((data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
    //TODO: too much repetition!
  } else if (cmd === "clearValue"){
    SNKit.clearValue(cmdData.fieldName, () => {
      window.postMessage({ type: "from_page", text: "completed", cmd: cmd }, "*");
    })
  } else if (cmd === "enableDisableField"){
    SNKit.enableDisableField(cmdData.fieldName, cmdData.disable, () => {
      window.postMessage({ type: "from_page", text: "completed", cmd: cmd }, "*");
    })
  } else if (cmd === "setRemoveMandatory"){
    SNKit.setRemoveMandatory(cmdData.fieldName, cmdData.mandatory, () => {
      window.postMessage({ type: "from_page", text: "completed", cmd: cmd }, "*");
    })
  } else if (cmd === "showHideField"){
    SNKit.showHideField(cmdData.fieldName, cmdData.show, () => {
      window.postMessage({ type: "from_page", text: "completed", cmd: cmd }, "*");
    })
  } else if (cmd === "showAllHiddenFields"){
    SNKit.showAllHiddenFields(cmdData.fieldDetails, () => {
      window.postMessage({ type: "from_page", text: "completed", cmd: cmd }, "*");
    })
  } else if (cmd === "showReference"){
    SNKit.showReference(cmdData.fieldName, () => {
      window.postMessage({ type: "from_page", text: "completed", cmd: cmd }, "*");
    })
  } else if (cmd === "getWidgetDetails"){
    SNKit.getWidgetDetails((data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  } else if (cmd === "isServicePortalPage"){
    SNKit.isServicePortalPage((data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  } else if (cmd === "isFormPage"){
    SNKit.isFormPage((data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  } else if (cmd === "isNotReadOnlyMode"){
    SNKit.isNotReadOnlyMode((data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  } else if (cmd === "showUiPolicies"){
    SNKit.showUiPolicies(cmdData.fieldName, (data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  } else if (cmd === "showClientScripts"){
    SNKit.showClientScripts(cmdData.fieldName, (data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  } else if (cmd === "showBusinessRules"){
    SNKit.showBusinessRules(cmdData.fieldName, (data) => {
      // send the data back to the content script
      window.postMessage({ type: "from_page", text: data, cmd: cmd }, "*");
    });
  }
}, false);