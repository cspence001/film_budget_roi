/* ======================================================================
 * IMPLEMENTATION REQUIREMENTS:
 * ======================================================================
 * 
 * CLIENT-SIDE
 * -INPUTS must have class "ic-field-required"
 * -LABELS must have the "for" attribute correctly populated and the "ic-label-required" class
 * -DIV with correct ID must be added to the page directly beneath the existing server-side placeholder for error messages (<div id="ic-error-message"></div>)
 * -SUBMIT button must have class "ic-button-primary" and cannot have javascript to disable itself on client click
 *
 * SERVER-SIDE
 * -MarkControlAsInvalid() must be updated to call the "throwError()" javascript function and pass in a message
 *     Protected Sub MarkControlAsInvalid(ByVal ctrl As WebControl, msg As String)
 *         Dim scriptKey As String = "MarkInvalid-" & ctrl.ClientID
 *         Dim javaScript As String = "$(function () { throwError('" & ctrl.ClientID & "', '" & msg & "'); });"
 *         ClientScript.RegisterClientScriptBlock(Me.GetType(), scriptKey, javaScript, True)
 *     End Sub
 *
 * -ResetControlsToValid() must be updated to call the "clearAllErrors()" javascript function
 *     Protected Sub ResetControlsToValid()
 *         Dim scriptKey As String = "ClearErrors-" & Now.ToString()
 *         Dim javaScript As String = "$(function () { clearAllErrors(); });"
 *         ClientScript.RegisterClientScriptBlock(Me.GetType(), scriptKey, javaScript, True)
 *     End Sub 
 *     
 *  NOTES
 *    Because the ADA client-side validation binds to submit button events (for postbacks), pages with recaptcha 
 *     replace the class ADA looks for to prevent conflicts. Any updates to the ADA js should occur there, too, if needed.
 */

// Global variables
var logicalErrorMsg = "";

var int_default_min_length = 1;
var int_default_max_length = 50;

function init_client_validate() {
    "use strict";

    var primary_button = $('.ic-button-primary');
    bindSubmitListeners(primary_button);

    //===========================================
    // Input validators
    //===========================================
    $(':input').each(function () {        
        bindInputValidation($(this));
    });

    //============================================
    // Required validators
    //============================================    
    $('.ic-field-required').each(function () {        
        bindRequiredValidation($(this));
    });            

    //============================================
    // Optional validators
    //============================================
    $(':input:not(.ic-field-required)').each(function () {      
        bindOptionalValidation($(this));
    });        
}

function undo_client_validate() {
    "use strict";

    var primary_button = $('.ic-button-primary');
    unbindSubmitListeners(primary_button);

    //===========================================
    // Input validators
    //===========================================
    $(':input').each(function () {
        unbindInputValidation($(this));
    });

    //============================================
    // Required validators
    //============================================    
    $('.ic-field-required').each(function () {
        unbindRequiredValidation($(this));
    });

    //============================================
    // Optional validators
    //============================================
    $(':input:not(.ic-field-required)').each(function () {
        unbindOptionalValidation($(this));
    })
}

function bindInputValidation(target) {   

    if ($(this).is(":disabled")) {
        return;
    }

    var target_type = target.getType();   
    var target_class = target.prop("class").toLowerCase();

    var field_type = (/ic-type-(\d*)/.test(target_class) ? target_class.match(/ic-type-([a-zA-Z]*)/)[1] : "");   
    var match_field = (/ic-match-(\d*)/.test(target_class) ? target_class.match(/ic-match-(\d*)/)[1] : "");

    var strong_pass = (/ic-field-newpassword/.test(target_class) ? target_class.match(/ic-field-newpassword/) : "");

    var min_length = parseInt((/ic-minlength-(\d*)/.test(target_class) ? target_class.match(/ic-minlength-(\d*)/)[1] : int_default_min_length));
    var max_length = parseInt((/ic-maxlength-(\d*)/.test(target_class) ? target_class.match(/ic-maxlength-(\d*)/)[1] : int_default_max_length));

    //------------------------------------
    // Checkbox validation
    //------------------------------------
    if (target_type === "checkbox") {
        target.on("click.input", function () {
            if ($(this).is(":checked")) {
                clearError($(this));
            }
        }).on("focusout.input", function () {
            if ($(this).is(":checked")) {
                clearError($(this));
            }
        });
    }

    //------------------------------------
    // Select validation
    //------------------------------------
    if (target_type === "select") {
        target.on("change.input", function () {
            if ($(this).attr("selectedIndex") !== 0) {
                clearError($(this));
            }
        }).on("focusout.input", function () {
            if ($(this).attr("selectedIndex") !== 0) {
                clearError($(this));
            }
        });
    }

    //------------------------------------
    // Textbox validation
    //------------------------------------
    if (target_type === "text" || target_type === "textarea" || target_type === "number") {
        switch (field_type) {

            case "":
            case "string":
                //------------------------------------
                // String type validation
                //------------------------------------
                var regex = new RegExp("^[a-zA-Z0-9-,.!@&$;+:`’‘<>=~}{|?$#^%*()\\\\\[\\]\\/\\_\\s']{" + min_length + "," + max_length + "}$");

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        if (!regex.test($(this).val())) {
                            if ($(this).val().length < min_length || $(this).val().length > max_length) {
                                throwError($(this).attr("id"), "Please enter a value between " + min_length + " and " + max_length + " characters long");
                            }
                            else {
                                throwError($(this).attr("id"), "This entry contains invalid characters");
                            }
                        }
                        else {
                            if ($(this).val().trim().length === 0) {
                                throwError($(this).attr("id"), "This entry is not valid");
                            }
                        }

                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });

                break;

            case "numeric":
                //------------------------------------
                // Numeric type validation
                //------------------------------------
                var regex = new RegExp("^\\d{" + min_length + "," + max_length + "}$");
                target.on("focusout.input", function () {
                    var target_class = target.prop("class").toLowerCase();
                    var min_value = parseInt((/ic-minvalue-(\d*(\.\d{1,2})?)/.test(target_class) ? target_class.match(/ic-minvalue-(\d*(\.\d{1,2})?)/)[1] : 0));
                    var max_value = parseInt((/ic-maxvalue-(\d*(\.\d{1,2})?)/.test(target_class) ? target_class.match(/ic-maxvalue-(\d*(\.\d{1,2})?)/)[1] : 0));

                    var this_num = $(this).val();
                    if (this_num.length > 0) {
                        if (!regex.test(this_num)) {
                            if ((this_num.length < min_length || this_num.length > max_length) && !isNaN(this_num)) {
                                if (min_length !== max_length) {
                                    throwError($(this).attr("id"), "Please enter a value between " + min_length + " and " + max_length + " digits long");
                                }
                                else {
                                    throwError($(this).attr("id"), "Please enter a value that is " + min_length + " digits long");
                                }
                            }
                            else {
                                throwError($(this).attr("id"), "This entry should only contain numbers");
                            }
                        }
                        else {
                            var field_value = parseInt($(this).val());
                            if (max_value !== 0 && min_value !== 0) {
                                if (field_value < min_value || field_value > max_value) {
                                    if (min_value !== max_value) {
                                        throwError($(this).attr("id"), "Please enter a value between " + min_value + " and " + max_value);
                                    }
                                    else {
                                        throwError($(this).attr("id"), "Please enter a value equal to " + min_value);
                                    }
                                }
                            }
                            else if (max_value !== 0) {
                                if (field_value > max_value) {
                                    throwError($(this).attr("id"), "Please enter a value of " + max_value + " or less");
                                }
                            }
                            else if (min_value !== 0) {
                                if (field_value < min_value) {
                                    throwError($(this).attr("id"), "Please enter a value of " + min_value + " or more");
                                }
                            }
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        var target_class = target.prop("class").toLowerCase();
                        var min_value = parseInt((/ic-minvalue-(\d*(\.\d{1,2})?)/.test(target_class) ? target_class.match(/ic-minvalue-(\d*(\.\d{1,2})?)/)[1] : 0));
                        var max_value = parseInt((/ic-maxvalue-(\d*(\.\d{1,2})?)/.test(target_class) ? target_class.match(/ic-maxvalue-(\d*(\.\d{1,2})?)/)[1] : 0));

                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                if (max_value !== 0 && min_value !== 0) {
                                    if ($(this).val() >= min_value && $(this).val() <= max_value) {
                                        clearError($(this));
                                    }
                                }
                                else if (max_value !== 0) {
                                    if ($(this).val() <= max_value) {
                                        clearError($(this));
                                    }
                                }
                                else if (min_value !== 0) {
                                    if ($(this).val() >= min_value) {
                                        clearError($(this));
                                    }
                                }
                                else {
                                    clearError($(this));
                                }
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });
                break;

            case "date":
                //------------------------------------
                // Date type validation
                //------------------------------------
                var min_date_pretty = get_min_date(target_class);
                var max_date_pretty = get_max_date(target_class);

                var min_date = new Date(min_date_pretty);
                var max_date = new Date(max_date_pretty);

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {

                        var this_date = $(this).val();
                        var sel_date = new Date(this_date);

                        if (!isValidDate(this_date)) {
                            throwError($(this).attr("id"), "Date should be entered in the following format: <b>mm/dd/yyyy</b>");
                        }
                        else {
                            if (sel_date < min_date || sel_date > max_date) {
                                throwError($(this).attr("id"), "Please enter a date between " + min_date_pretty + " and " + max_date_pretty);
                            }
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {

                            var this_date = $(this).val();
                            if (isValidDate(this_date)) {

                                var sel_date = new Date(this_date);
                                if (sel_date > min_date || sel_date < max_date) {
                                    //clear error
                                    clearError($(this));
                                }
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });

                break;

            case "zip":
                //------------------------------------
                // Zip type validation
                //------------------------------------
                var regex = new RegExp("^\\d{5}([\-]?\\d{4})?$");

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        if (!regex.test($(this).val())) {
                            throwError($(this).attr("id"), "Zip code should be entered in one of the following formats: <b>xxxxx</b> or <b>xxxxx-xxxx</b>");
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });

                break;

            case "postal":
                //------------------------------------
                // Postal type validation
                //------------------------------------
                var regex = new RegExp("^(?!.*[DFIOQU])[A-VXYa-vxy][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]$");

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        if (!regex.test($(this).val())) {
                            if ($(this).val().length !== 6) {
                                throwError($(this).attr("id"), "Postal code should be 6 characters long");
                            }
                            else {
                                throwError($(this).attr("id"), "Please verify the second, fourth and sixth characters are numeric");
                            }
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });

                break;

            case "bankaccount":
                //------------------------------------
                // Bank Account type validation
                //------------------------------------
                var regex = new RegExp("^[X0-9]{" + min_length + "," + max_length + "}$");

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        if (!regex.test($(this).val())) {
                            throwError($(this).attr("id"), "Please enter a valid bank account");
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });

                break;

            case "creditcard":
                //------------------------------------
                // Credit Card type validation
                //------------------------------------
                target.on("keypress.input", function (e) {
                    var unicode = e.charCode ? e.charCode : e.keyCode;

                    // allow numbers, delete/backspace and arrow keys
                    var validKeys = new Array(17);
                    validKeys[0] = 8;
                    validKeys[1] = 9;
                    validKeys[2] = 37;
                    validKeys[3] = 38;
                    validKeys[4] = 39;
                    validKeys[5] = 40;
                    validKeys[7] = 48;
                    validKeys[8] = 49;
                    validKeys[9] = 50;
                    validKeys[10] = 51;
                    validKeys[11] = 52;
                    validKeys[12] = 53;
                    validKeys[13] = 54;
                    validKeys[14] = 55;
                    validKeys[15] = 56;
                    validKeys[16] = 57;

                    // If the keycode is in the list of valid keys return true
                    for (var x = 0; x < validKeys.length; x++) {
                        if (unicode === validKeys[x]) {
                            return true;
                        }
                    }

                    return false;

                }).on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        var field_value = $(this).val();
                        var regex = new RegExp("^([23456])\\d{" + (min_length - 1) + "," + (max_length - 1) + "}$");
                        var int_start_digit = parseInt(field_value.substring(0, 1), 10);
                        var masked = false;

                        if (field_value.length >= 12 && field_value.length <= 16) {
                            if (field_value.indexOf("X") >= 0) {
                                var mask_count = field_value.match(/X/g).length;
                                if (mask_count === 8) {
                                    masked = true;
                                    regex = new RegExp("^([23456])\\d{3}X{8}\\d{3,4}");
                                }
                                else if (mask_count === 12) {
                                    masked = true;
                                    regex = new RegExp("^X{12}\\d{3,4}");
                                }
                                else if (mask_count === 11) {
                                    //Amex has 11 masked since only 15 digits long
                                    masked = true;
                                    regex = new RegExp("^X{11}\\d{3,4}");
                                }
                            }
                        }

                        if (int_start_digit === 3) {
                            // American Express is 15 digits long
                            regex = new RegExp("^([23456])\\d{14}$");
                        }

                        if (!regex.test(field_value)) {
                            // throw error                                                                          
                            throwError($(this).attr("id"), "Please enter a valid credit card number");
                        }
                        else {
                            if (!validateLuhnChecksum(field_value) && !masked) {
                                // throw error                                                                          
                                throwError($(this).attr("id"), "Please enter a valid credit card number");
                            }
                            else if (!$('img[id$="imgVisa"]').length && int_start_digit === 4) {
                                // Visa not accepted
                                throwError($(this).attr("id"), "Visa is not accepted for this Invoice Type");
                            }
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            var field_value = $(this).val();
                            var regex = new RegExp("^([23456])\\d{" + (min_length - 1) + "," + (max_length - 1) + "}$");
                            var int_start_digit = parseInt(field_value.substring(0, 1), 10);

                            if (field_value.length >= 12 && field_value.length <= 16) {
                                if (field_value.indexOf("X") >= 0) {
                                    var mask_count = field_value.match(/X/g).length;
                                    if (mask_count === 8) {
                                        regex = new RegExp("^([23456])\\d{3}X{8}\\d{3,4}");
                                    }
                                    else if (mask_count === 12) {
                                        regex = new RegExp("^X{12}\\d{3,4}");
                                    }
                                    else if (mask_count === 11) {
                                        //Amex has 11 masked since only 15 digits long
                                        regex = new RegExp("^X{11}\\d{3,4}");
                                    }
                                }
                            }

                            if (int_start_digit === 3) {
                                // American Express is 15 digits long
                                regex = new RegExp("^([23456])\\d{14}$");
                            }

                            if (regex.test(field_value) && validateLuhnChecksum(field_value)) {
                                if (!$('img[id$="imgVisa"]').length) {
                                    if (int_start_digit !== 4) {
                                        clearError($(this));
                                    }
                                }
                                else {
                                    clearError($(this));
                                }
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });

                break;

            case "phone":
                //------------------------------------
                // Phone type validation
                //------------------------------------            
                var phone_wrap = target.closest("div");
                var phone_id = target.attr("id");
                var sub_phone_id = phone_id.substring(0, (phone_id.length - 2));
                var regex = new RegExp("^[2-9]\\d{2}(?!\\d[1]{2}|[5]{3})([2-9]\\d{2})\\d{4}$");

                phone_wrap.on("focusout.input", function () {
                    var has_full_value = true;
                    var phone_inputs = $(this).children(".ic-type-phone");

                    phone_inputs.each(function () {
                        has_full_value = ($(this).val().length > 0 ? has_full_value : false);
                    });

                    if (has_full_value) {
                        var field_value = $('#' + sub_phone_id + '_1').val() + $('#' + sub_phone_id + '_2').val() + $('#' + sub_phone_id + '_3').val();
                        if (field_value.length > 0) {
                            if (!regex.test(field_value)) {
                                throwError($(this).attr("id"), "Please enter a valid 10-digit phone number");
                            }
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        var field_value = $('#' + sub_phone_id + '_1').val() + $('#' + sub_phone_id + '_2').val() + $('#' + sub_phone_id + '_3').val();
                        if (field_value.length > 0) {
                            if (regex.test(field_value)) {
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });
                break;

            case "email":
                //------------------------------------
                // Email type validation
                //------------------------------------
                var emailReg = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\"[^\"\\]+\"))@((\[(([0-1]?[0-9]{1,2}\.)|(2[0-4][0-9]\.)|(25[0-5]\.)){3}(([0-1]?[0-9]{1,2})|(2[0-4][0-9])|(25[0-5]))\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                var regex = new RegExp(emailReg);

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        var emailText = $(this).val().trim();
                        $(this).val(emailText);
                        if (!regex.test(emailText)) {
                            throwError($(this).attr("id"), "Please enter your email address in the following format: <b>username@domain.com</b>");
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                //clear error                                
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }  
                });
                break;

            case "money":
                //------------------------------------
                // Money type validation
                //------------------------------------
                var min_value = parseFloat((/ic-minvalue-(\d*(\.\d{1,2})?)/.test(target_class) ? target_class.match(/ic-minvalue-(\d*(\.\d{1,2})?)/)[1] : 0));
                var max_value = parseFloat((/ic-maxvalue-(\d*(\.\d{1,2})?)/.test(target_class) ? target_class.match(/ic-maxvalue-(\d*(\.\d{1,2})?)/)[1] : 0));

                var regex = new RegExp("^\\d*(\\.\\d{1,2})?$");

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        var field_value = $(this).val();
                        var field_value_temp;
                        
                        if (field_value.indexOf("$") === 0) {                            
                            field_value = field_value.replace("$", "")
                        }
                        
                        if (regex.test(field_value)) {                            
                            field_value_temp = parseFloat(field_value);                            
                            $(this).val(Number(field_value).toFixed(2));                               
                            if (max_value !== 0 && min_value !== 0) {                                
                                if (field_value_temp < min_value || field_value_temp > max_value) {
                                    if (min_value !== max_value) {
                                        throwError($(this).attr("id"), "Please enter a value between $" + min_value + " and $" + max_value);
                                    }
                                    else {
                                        throwError($(this).attr("id"), "Please enter a value equal to $" + min_value);
                                    }
                                }
                            }
                            else if (max_value !== 0) {
                                if (field_value_temp > max_value) {
                                    throwError($(this).attr("id"), "Please enter a value of $" + max_value + " or less");
                                }
                            }
                            else if (min_value !== 0) {
                                if (field_value < min_value) {
                                    throwError($(this).attr("id"), "Please enter a value of $" + min_value + " or more");
                                }
                            }                                                       
                        }
                        else {                            
                            throwError($(this).attr("id"), "Please enter a valid dollar amount.");
                        }
                        
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            var field_value = $(this).val();
                            var field_value_temp;
                            if (regex.test(field_value)) {                                
                                field_value_temp = parseFloat(field_value);
                                if (max_value !== 0 && min_value !== 0) {
                                    if (field_value_temp >= min_value && field_value_temp <= max_value) {
                                        clearError($(this));
                                    }
                                }
                                else if (max_value !== 0) {
                                    if (field_value_temp <= max_value) {
                                        clearError($(this));
                                    }
                                }
                                else if (min_value !== 0) {
                                    if (field_value_temp >= min_value) {
                                        clearError($(this));
                                    }
                                }
                                else {
                                    clearError($(this));
                                }
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });
                break;           
        }
    }

    //------------------------------------
    // Password validation
    //------------------------------------
    if (target_type === "password") {
        switch (field_type) {

            case "":
            case "string":
                //------------------------------------
                // String type validation
                //------------------------------------
                var regex = new RegExp("^[a-zA-Z0-9-,.!@&$;+:`’‘<>=~}{|?$#^%*()\\\\\[\\]\\/\\_\\s']{" + min_length + "," + max_length + "}$");

                target.on("focusout.input", function () {
                    if ($(this).val().length > 0) {
                        if (!regex.test($(this).val())) {
                            if ($(this).val().length < min_length || $(this).val().length > max_length) {
                                throwError($(this).attr("id"), "Please enter a value between " + min_length + " and " + max_length + " characters long.");
                            }
                            else {
                                throwError($(this).attr("id"), "This entry contains invalid characters");
                            }
                        }
                    }
                }).on("keyup.input", function (e) {
                    if (!ignoredKey(e)) {
                        if ($(this).val().length > 0) {
                            if (regex.test($(this).val())) {
                                clearError($(this));
                            }
                        }
                        else {
                            clearError($(this));
                        }
                    }
                });
                break;
        }
    }

    //------------------------------------
    // Match validation
    //------------------------------------                
    if (match_field !== '') {
        var master = $('.ic-match-' + match_field + '-master');
        var master_label = $("label[for='" + master.attr('id') + "']").text();
        var child = $('.ic-match-' + match_field + '-child');
        var child_label = $("label[for='" + child.attr('id') + "']").text();

        master.on("focusout.input", function () {
            if (child.val() !== '' && child.val().toLowerCase() !== $(this).val().toLowerCase()) {
                throwError(child.attr("id"), "<b>" + master_label + "</b> and <b>" + child_label + "</b> must match");
            }
            else {
                clearError(child);
            }
        }).on("keyup.input", function (e) {
            if (!ignoredKey(e)) {
                if (master.val().toLowerCase() === child.val().toLowerCase()) {
                    clearError(child);
                }
            }
        });

        child.off("focusout.input").on("focusout.input", function () {
            if (master.val().toLowerCase() !== child.val().toLowerCase()) {
                throwError(child.attr("id"), "<b>" + master_label + "</b> and <b>" + child_label + "</b> must match");
            }
            else {
                clearError(child);
            }
        }).off("keyup.input").on("keyup.input", function (e) {
            if (!ignoredKey(e)) {
                if (master.val().toLowerCase() === child.val().toLowerCase() && master.val().length > 0) {
                    if (!master.hasError() || child.val().length === 0) {
                        clearError(child);
                    }
                }
            }
        });
    }

    //------------------------------------
    // Password Strength validation
    //------------------------------------
    if (strong_pass !== '') {
        initializePasswordMeter(target);
    }
}

function unbindInputValidation(target) {
    target.off("click.input focusout.input change.input keyup.input keypress.input");
}

function bindRequiredValidation(target) {         

    if ($(this).is(":disabled")) {
        return;
    }

    var target_type = target.getType();
    var target_class = target.prop("class").toLowerCase();
    var target_label = $("label[for='" + target.attr('id') + "']");
    var field_type = (/ic-type-(\d*)/.test(target_class) ? target_class.match(/ic-type-([a-zA-Z]*)/)[1] : "");

    // Adding aria attribute
    addAttributeValue(target, 'aria-required', 'true');

    if (!target.hasClass("ic-field-required")) {
        target.addClass("ic-field-required");
    }

    // Adding asterisk markup
    target_label.each(function () {
        var label_class = $(this).prop("class").toLowerCase();
        if (/ic-label-required/.test(label_class)) {
            $(this).append('<span aria-hidden="true" class="ic-required-asterisk">*</span>');
        }
    });

    if (target_type === "checkbox") {
        target.on("focusout.required", function () {
            if (!$(this).is(":checked")) {
                throwError($(this).attr("id"), "");
            }
        });
    }

    if (target_type === "select") {
        target.on("focusout.required", function () {
            if (!$(this).hasError()) {
                if (($(this).prop("selectedIndex") === 0 && $(this).find('option').length > 1) || $(this).prop("selectedIndex") === -1) {
                    throwError($(this).attr("id"), "Please make a selection");
                }
            }
        });
    }

    if (target_type === "password") {
        target.on("focusout.required", function () {
            if (!$(this).hasError()) {
                if ($(this).val().length === 0) {
                    throwError($(this).attr("id"), "Please enter a password");
                }
            }
        });
    }

    if (target_type === "text" || target_type === "textarea" || target_type === "number") {

        var msg = "Please enter a value";
        switch (field_type) {

            case "":
            case "string":
                msg = "Please enter a value";
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "numeric":
                msg = "Please enter a number";                   
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "date":
                msg = "Please enter a date";
                target.on("focusout.required", function (e) {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            if (!$(e.relatedTarget).hasClass("datepicker-button")) {
                                throwError($(this).attr("id"), msg);
                            }
                        }
                    }
                    target.next(".datepicker-button").on("focusout.required", function (e) {
                        if (!$(e.relatedTarget).hasError()) {
                            if ($(this).prev(".ic-type-date").val().length === 0) {
                                if ($(e.relatedTarget).attr("id") !== $(this).prev(".ic-type-date").attr("id")) {
                                    throwError($(this).prev(".ic-type-date").attr("id"), msg);
                                }
                            }
                        }
                    });
                });
                break;

            case "zip":
                msg = "Please enter a zip code";
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "postal":
                msg = "Please enter a postal code";
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "bankaccount":
                msg = "Please enter your bank account number";
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "creditcard":
                msg = "Please enter your credit card number";
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "email":
                msg = "Please enter an email address";                
                target.on("focusout.required", function () {                    
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "money":
                msg = "Please enter an amount";
                target.on("focusout.required", function () {
                    if (!$(this).hasError()) {
                        if ($(this).val().length === 0) {
                            throwError($(this).attr("id"), msg);
                        }
                    }
                });
                break;

            case "phone":               
                var phone_wrap = target.closest("div");
                var phone_id = target.attr("id");
                var sub_phone_id = phone_id.substring(0, (phone_id.length - 2));

                msg = "Please enter a phone number";

                phone_wrap.on("focusout.required", function (e) {
                    if ($(this).has(e.relatedTarget).length === 0) {
                        var has_error = false;
                        var phone_inputs = $(this).children(".ic-type-phone");

                        phone_inputs.each(function () {
                            has_error = ($(this).hasError() ? true : has_error);
                        });

                        if (!has_error) {
                            var field_value = $('#' + sub_phone_id + '_1').val() + $('#' + sub_phone_id + '_2').val() + $('#' + sub_phone_id + '_3').val();
                            if (field_value.length === 0) {
                                throwError($(this).attr("id"), msg);
                            }
                        }
                    }
                });
                break;
        }
    }
}

function unbindRequiredValidation(target) {
    target.off("focusout.required");
    target.removeClass("ic-field-required");
}

function bindOptionalValidation(target) {   

    if ($(this).is(":disabled")) {
        return;
    }

    var target_type = target.getType();
    var target_class = target.prop("class").toLowerCase();
    var field_type = (/ic-type-(\d*)/.test(target_class) ? target_class.match(/ic-type-([a-zA-Z]*)/)[1] : "");

    if (target_type === "checkbox") {
        target.on("click.optional", function () {
            if (!$(this).is(":checked")) {
                clearError($(this));
            }
        });
    }
    //else if (target_type === "select") {
    //    target.focusout(function () {
    //        if (($(this).prop("selectedIndex") === 0 && $(this).find('option').length > 1) || $(this).prop("selectedIndex") === -1) {
    //            throwError($(this).attr("id"), "Please make a selection");
    //        }
    //    });
    //}
    else if (target_type === "password") {
        target.on("focusout.optional", function () {
            if ($(this).val().length === 0) {
                clearError($(this));
            }
        }).on("keyup.optional", function () {
            if ($(this).val().length === 0) {
                clearError($(this));
            }
        });
    }
    else if (target_type === "text" || target_type === "textarea") {

        switch (field_type) {

            case "":
            case "string":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "numeric":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "date":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "zip":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "postal":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "bankaccount":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                })
                break;
            case "creditcard":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "email":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "money":
                target.on("focusout.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    if ($(this).val().length === 0) {
                        clearError($(this));
                    }
                });
                break;
            case "phone":
                var phone_id = target.attr("id");
                var sub_phone_id = phone_id.substring(0, (phone_id.length - 2));
                target.on("focusout.optional", function () {
                    var field_value = $('#' + sub_phone_id + '_1').val() + $('#' + sub_phone_id + '_2').val() + $('#' + sub_phone_id + '_3').val();
                    if (field_value.length === 0) {
                        clearError($(this));
                    }
                }).on("keyup.optional", function () {
                    var field_value = $('#' + sub_phone_id + '_1').val() + $('#' + sub_phone_id + '_2').val() + $('#' + sub_phone_id + '_3').val();
                    if (field_value.length === 0) {
                        clearError($(this));
                    }
                });
                break;
        }
    }
}

function unbindOptionalValidation(target) {
    target.off("click.optional focusout.optional keyup.optional");
}

function bindSubmitListeners(button) {
    if (!button.hasClass("bound")) {               
        updateSubmitBindings(button, 1);
        button.addClass("bound");
    }
}

function unbindSubmitListeners(button) {
    updateSubmitBindings(button, 0);
    button.removeClass("bound");
}

function validateLuhnChecksum(cardNumber) {
    var sum = 0;
    var mul = 1;
    for (var x = cardNumber.length; x > 0; x--) {
        var card_check = parseInt(cardNumber.charAt(x - 1), 10) * mul;
        if (card_check >= 10 ? sum += (card_check % 10) + 1 : sum += card_check);
        if (mul === 1 ? mul++ : mul--);
    }
    return ((sum % 10) === 0);
}

function ignoredKey(event) {
    var keycode = getKeyCode(event);
    switch (keycode) {
        //case 8:
        case 9:
        case 13: 
        case 16:
        case 27:
            return true;      
        default:
            return false;
    }
}

function addAttributeValue(target, attribute, value) {
    if (target.hasAttr(attribute)) {
        if (target.attr(attribute).indexOf(value) === -1) {
            target.attr(attribute, target.attr(attribute) + ' ' + value);            
        }
    }
    else {
        target.attr(attribute, value);
    }    
}

function removeAttributeValue(target, attribute, value) {
    if (target.hasAttr(attribute)) {
        if (target.attr(attribute).indexOf(value) >= 0) {
            var attrValues = target.attr(attribute).replace(value, '');
            if (!attrValues.trim()) {
                target.removeAttr(attribute);
            }
            else {
                target.attr(attribute, attrValues.trim());
            }
        }
    }        
}


/**
 * Disable or Enable LinkButton or anchor based on selected accounts.
 * @param {Object} accountsSelected
 * @param {string} controlClientID
 * @param {bool} boundEventListeners
 * @returns {bool}
 */
function setButtonAvailability(accountsSelected, controlClientID, boundEventListeners) {
    var button = $("a[id$='" + controlClientID + "']");
    if ($.isEmptyObject(accountsSelected)) {
        //reduce opacity to give the feeling of a disabled button
        $(button).css({ "opacity": "0.65", "pointer-events": "none" });
        //need to remove event listeners bound so that the Enter key does not submit
        addAttributeValue(button, 'aria-disabled', 'true');
        updateSubmitBindings(button, 0);
        
        return false;
    } else {
        //enable the button
        if (!boundEventListeners) {
            //return to full opacity to give the feel of an enabled button
            $(button).css({ "opacity": "1", "pointer-events": "auto", "cursor": "pointer" });
            //also re-add the event listeners for submitting using the keyboard
            removeAttributeValue(button, 'aria-disabled', 'true');
            updateSubmitBindings(button, 1);
            
            return true;
        }
    }
};

function clearAllErrors() {
    $(".has-ic-error").each(function () {
        var target = $(this).find(':input');
        clearError(target);
    });
}

function clearError(target) {    
    var target_class = target.prop("class").toLowerCase();
    var field_type = (/ic-type-(\d*)/.test(target_class) ? target_class.match(/ic-type-([a-zA-Z]*)/)[1] : "");
    var target_div;

    if (field_type === "phone" || target.getType() === "div") {

        if (field_type === "phone") {
            target = target.closest(".has-ic-error");            
        }

        target_div = target;

        var target_inputs = target_div.children("input");
        target_inputs.each(function () {
            removeAttributeValue($(this), 'aria-describedby', 'ic-errorfor-' + target_div.attr('id'));
            removeAttributeValue($(this), 'aria-invalid', 'true');
        });

    }
    else {
        target_div = target.closest(".has-ic-error");
        removeAttributeValue(target, 'aria-describedby', 'ic-errorfor-' + target.attr('id'))
        removeAttributeValue(target, 'aria-invalid', 'true');     
    }           
        
    target_div.removeClass("has-ic-error");

    if ($('#ic-errorfor-' + target.attr('id')).length) {
        var error = $('#ic-errorfor-' + target.attr('id'));
        error.remove();
    }         
}    

function testForError(target) {
    target.focus().keyup().blur();
}

function hasNoErrors() {
    var noErrors = true;

    // Reset in case there are 
    // server-side errors
    clearAllErrors();
    
    $('.ic-field-required').each(function () {
        // Test for error to trigger pre-built validation
        testForError($(this));       
    });

    if ($(".has-ic-error").length) {
        noErrors = false;       
    }       
    
    if (noErrors === false) {
        throwWellError("ic-error-message", "There are problems with some of the entries below. If a field is marked as required it must have a valid entry.");
    }
    else if (logicalErrorMsg.length) {
        throwWellError("ic-error-message", logicalErrorMsg);
        noErrors = false;
    }
    
    return noErrors;
}

function addErrorMarkup(well) {
    var error;
    error = '<div role="alert" class="alert alert-danger alert-dismissible sso-alert-danger"><p>';
    error += '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span></button>';
    error += '<span id="ic-well-message"></span>';
    error += '</p></div>';
    well.append(error);
}

function clearWellError() {
    $('.alert-dismissible').remove();
}

function throwWellError(placeholder, msg) {
    var errorWell = $("#" + placeholder);
    
    if (errorWell.length) {          
        if (!$("#ic-well-message").length) {            
            addErrorMarkup(errorWell);
        }

        $("#ic-well-message").empty();
        window.setTimeout(function () {
            $("#ic-well-message").html(msg);            
        }, 100);        
    }    

    $(".has-ic-error:first input:first").focus().select();
    window.scrollTo(0, 0);
}

function throwError(target_id, msg) {
    var target = $('#' + target_id);
    var target_class = target.prop("class").toLowerCase();
    var field_type = (/ic-type-(\d*)/.test(target_class) ? target_class.match(/ic-type-([a-zA-Z]*)/)[1] : "");
    var group_control = (/ic-group-control/.test(target_class) ? "true" : "false");   
    var target_div;    

    if (field_type === "phone" || target.getType() === "div") {

        if (field_type === "phone") {
            target = target.closest("div");
        }        
        target_div = target;

        var error = $('#ic-errorfor-' + target_div.attr("id"));
        
        if (error.length) {            
            // Update message if error already exists
            if (msg.length > 0) error.html('<i class="glyphicon glyphicon-alert" aria-label="Error"></i>&nbsp;&nbsp;' + msg);
        }
        else {
            // New error               
            var errorHtml = "";

            if (msg.length > 0) {
                errorHtml += '<p id="ic-errorfor-' + target_div.attr('id') + '" class="ic-input-client-error">';
                errorHtml += '<i class="glyphicon glyphicon-alert" aria-label="Error"></i>&nbsp;&nbsp;' + msg;
                errorHtml += '</p>';
            }
        }

        var target_inputs = target_div.children("input");
        target_inputs.each(function () {
            if (msg.length) {
                addAttributeValue($(this), 'aria-describedby', 'ic-errorfor-' + target_div.attr('id'));
            }
            addAttributeValue($(this), 'aria-invalid', 'true');
        });

        target_div.append(errorHtml);
    }
    else {
        target_div = target.closest(".form-group");

        if (!target_div.length) {
            target_div = target.closest("div");
        }                                   

        var error = $('#ic-errorfor-' + target.attr("id"));

        if (error.length) {
            // Update message if error already exists
            if (msg.length > 0) error.html('<i class="glyphicon glyphicon-alert" aria-label="Error"></i>&nbsp;&nbsp;' + msg);
        }
        else {
            // New error               
            var errorHtml = "";

            if (msg.length > 0) {
                errorHtml += '<p id="ic-errorfor-' + target.attr('id') + '" class="ic-input-client-error">';
                errorHtml += '<i class="glyphicon glyphicon-alert" aria-label="Error"></i>&nbsp;&nbsp;' + msg;
                errorHtml += '</p>';
            }
        }

        if (msg.length) addAttributeValue(target, 'aria-describedby', 'ic-errorfor-' + target.attr('id'));

        addAttributeValue(target, 'aria-invalid', 'true');

        if (field_type === "date" || target.getType() === "checkbox" || group_control === "true") {
            target.closest('div').after(errorHtml);
        }
        else {
            target.after(errorHtml);
        }  
    }                

    target_div.addClass("has-ic-error");                                                         
}

function get_min_date(target_class) {
    var min_date = (/ic-mindate-(\d*)/.test(target_class) ? target_class.match(/ic-mindate-(\d*)/)[1] : "today");
    if (min_date !== 'today') {
        min_date = '' + min_date.substring(0, 2) + '/' + min_date.substring(2, 4) + '/' + min_date.substring(4, 8) + '';
    }
    else {
        //changed to 1900 for default//
        min_date = "01/01/1900";
    }
    return min_date;
}

function get_max_date(target_class) {
    var max_date = (/ic-maxdate-(\d*)/.test(target_class) ? target_class.match(/ic-maxdate-(\d*)/)[1] : "tomorrow");
    if (max_date !== 'tomorrow') {
        max_date = '' + max_date.substring(0, 2) + '/' + max_date.substring(2, 4) + '/' + max_date.substring(4, 8) + '';
    }
    else {
        //changed to 2050 for default//
        max_date = "01/01/2050";
    }
    return max_date;
}

function submit_postback(button) {
    var button_id = button.attr("id");    
    button_id = button_id.replace(/\_/g, "$");
   
    if (!button.hasAttr("aria-disabled")) {                       
        if (button.outerWidth() >= 109) {
            button.css("width", button.outerWidth() + "px");
        }

        addAttributeValue(button, "aria-disabled", "true"); 
        button.css({ "opacity": ".65", "cursor": "not-allowed" })
            .html("Please wait...");

        clearWellError();

        setTimeout(function () {
            __doPostBack('' + button_id + '', '');
        }, 100);
    }    
}

function updateSubmitBindings(button, bind_bit) {    
    if (typeof button.attr("id") !== 'undefined') {        
        if (bind_bit === 1) {                       
            // Enter/Space/Click on button
            button.on("keypress." + button.attr("id"), subOnKeyPress);
            button.on("click." + button.attr("id"), subOnClick);
            //console.log("keypress/click bound: " + button.attr("id"));

            // Global "Hit Enter"
            $(document).on("keypress." + button.attr("id"), subOnEnter);
            //console.log("enter bound: " + button.attr("id"));                      
        }

        if (bind_bit === 0) {
            // Enter/Space/Click on button
            button.off("keypress." + button.attr("id"));
            button.off("click." + button.attr("id"));
            //console.log("keypress/click unbound: " + button.attr("id"));

            // Global "Hit Enter"
            $(document).off("keypress." + button.attr("id"));
            //console.log("enter unbound: " + button.attr("id"));    
        }
    } 

    function subOnKeyPress(e) {       
        var keycode = getKeyCode(e);

        if (keycode === 13 || keycode === 32) {            
            if (!hasNoErrors()) {
                e.preventDefault();
            }
            else {
                submit_postback(button);
                e.preventDefault();
            }
        }
    }

    function subOnClick(e) {         
        if (!hasNoErrors()) {
            e.preventDefault();
        }
        else {
            submit_postback(button);
            e.preventDefault();
        }
    }

    function subOnEnter(e) {        
        var keycode = getKeyCode(e);
        
        if (keycode === 13) {             
            if (!hasNoErrors()) {
                e.preventDefault();
            }
            else {
                submit_postback(button);
                e.preventDefault();
            }
        }
    }     
}

function getKeyCode(event) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (event) keycode = event.which;

    return keycode;
}

function disable_postback(msg) {   
    logicalErrorMsg = msg;   
}

function enable_postback() {   
    logicalErrorMsg = "";    
}

function initializePasswordMeter(target) {   
    //var timeoutHandle;
    var parent_pass = target.parents().eq(2);
    var progress = parent_pass.find('.password-meter');
    var progress_meter = progress.find('div');
    var progress_label = progress.find('label');
    var input_width = progress.parent(1).width();
    
    progress_meter.width('100%');   
    progress.css("padding-right", "10px");

    var options = {};
    options.ui = {
        container: "#Password",
        showVerdictsInsideProgressBar: true,
        progressBarEmptyPercentage: 0,
        progressBarMinPercentage: 25,
        colorClasses: ["danger", "danger", "danger", "warning", "success", "success"],
        viewports: {
            progress: '#' + progress_meter.attr("id") + ''
        }
    };  

    if (progress_meter.html() === '') {
        target.pwstrength(options);
        addAttributeValue(progress_meter.find('.password-verdict'), 'aria-live', 'polite');       
    }

    target.focus(function () {        
        parent_pass.find('.password-meter').fadeIn(300);        
        var descriptors = progress_label.attr('id') + ' ' + progress_meter.attr("id");
        addAttributeValue($(this), 'aria-describedby', descriptors);       
    });
}

function isValidDate(date_string) {
    var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var year;
    var month;
    var day;
    var date_parts = null;
    var rtrn = true;
    //date_parts = date_string.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    date_parts = date_string.match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/);
    if (date_parts) {
        month = date_parts[1];
        day = date_parts[2];
        year = date_parts[3];

    }
    if (date_parts) {
        if (1 <= month && month <= 12) {
            if (month == 2) {
                if (year % 4 !== 0 ? false : (year % 100 !== 0 ? true : (year % 1000 !== 0 ? false : true))) {
                    rtrn = (1 <= day && day <= 29);
                } else {
                    rtrn = (1 <= day && day <= 28);
                }
            } else {
                rtrn = (1 <= day && day <= days[month - 1]);
            }
        } else {
            rtrn = false;
        }
    } else {
        rtrn = false;
    }
    return rtrn;
}

$.fn.getType = function () { return this.prop('nodeName') === "INPUT" ? this[0].type.toLowerCase() : this[0].tagName.toLowerCase(); };
$.fn.hasAttr = function (name) { return typeof this.attr(name) !== "undefined"; };
$.fn.hasError = function () { return typeof this.attr("aria-invalid") !== "undefined" && this.attr("aria-invalid") === "true"; };

/* pwstrength-bootstrap 2016-06-27 - GPLv3 & MIT License */
!function (a) { var b = {}; !function (a, b) { "use strict"; a.fallback = { wordLength: "Your password is too short", wordNotEmail: "Do not use your email as your password", wordSimilarToUsername: "Your password cannot contain your username", wordTwoCharacterClasses: "Use different character classes", wordRepetitions: "Too many repetitions", wordSequences: "Your password contains sequences", errorList: "Errors:", veryWeak: "Weak", weak: "Weak", normal: "Normal", medium: "Medium", strong: "Strong", veryStrong: "Very Strong" }, a.t = function (c) { var d = ""; return d = b ? b.t(c) : a.fallback[c], d === c ? "" : d } }(b, window.i18next); var c = {}; try { if (!a && module && module.exports) { var a = require("jquery"), d = require("jsdom").jsdom; a = a(d().parentWindow) } } catch (e) { } !function (a, b) { "use strict"; var c = {}; b.forbiddenSequences = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm", "!@#$%^&*()_+"], c.wordNotEmail = function (a, b, c) { return b.match(/^([\w\!\#$\%\&\'\*\+\-\/\=\?\^\`{\|\}\~]+\.)*[\w\!\#$\%\&\'\*\+\-\/\=\?\^\`{\|\}\~]+@((((([a-z0-9]{1}[a-z0-9\-]{0,62}[a-z0-9]{1})|[a-z])\.)+[a-z]{2,6})|(\d{1,3}\.){3}\d{1,3}(\:\d{1,5})?)$/i) ? c : 0 }, c.wordLength = function (a, b, c) { var d = b.length, e = Math.pow(d, a.rules.raisePower); return d < a.common.minChar && (e += c), e }, c.wordSimilarToUsername = function (b, c, d) { var e = a(b.common.usernameField).val(); return e && c.toLowerCase().match(e.replace(/[\-\[\]\/\{\}\(\)\*\+\=\?\:\.\\\^\$\|\!\,]/g, "\\$&").toLowerCase()) ? d : 0 }, c.wordTwoCharacterClasses = function (a, b, c) { return b.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/) || b.match(/([a-zA-Z])/) && b.match(/([0-9])/) || b.match(/(.[!,@,#,$,%,\^,&,*,?,_,~])/) && b.match(/[a-zA-Z0-9_]/) ? c : 0 }, c.wordRepetitions = function (a, b, c) { return b.match(/(.)\1\1/) ? c : 0 }, c.wordSequences = function (c, d, e) { var f, g = !1; return d.length > 2 && (a.each(b.forbiddenSequences, function (b, c) { if (!g) { var e = [c, c.split("").reverse().join("")]; a.each(e, function (a, b) { for (f = 0; f < d.length - 2; f += 1) b.indexOf(d.toLowerCase().substring(f, f + 3)) > -1 && (g = !0) }) } }), g) ? e : 0 }, c.wordLowercase = function (a, b, c) { return b.match(/[a-z]/) && c }, c.wordUppercase = function (a, b, c) { return b.match(/[A-Z]/) && c }, c.wordOneNumber = function (a, b, c) { return b.match(/\d+/) && c }, c.wordThreeNumbers = function (a, b, c) { return b.match(/(.*[0-9].*[0-9].*[0-9])/) && c }, c.wordOneSpecialChar = function (a, b, c) { return b.match(/[!,@,#,$,%,\^,&,*,?,_,~]/) && c }, c.wordTwoSpecialChar = function (a, b, c) { return b.match(/(.*[!,@,#,$,%,\^,&,*,?,_,~].*[!,@,#,$,%,\^,&,*,?,_,~])/) && c }, c.wordUpperLowerCombo = function (a, b, c) { return b.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/) && c }, c.wordLetterNumberCombo = function (a, b, c) { return b.match(/([a-zA-Z])/) && b.match(/([0-9])/) && c }, c.wordLetterNumberCharCombo = function (a, b, c) { return b.match(/([a-zA-Z0-9].*[!,@,#,$,%,\^,&,*,?,_,~])|([!,@,#,$,%,\^,&,*,?,_,~].*[a-zA-Z0-9])/) && c }, b.validation = c, b.executeRules = function (c, d) { var e = 0; return a.each(c.rules.activated, function (f, g) { if (g) { var h, i, j = c.rules.scores[f], k = b.validation[f]; a.isFunction(k) || (k = c.rules.extra[f]), a.isFunction(k) && (h = k(c, d, j), h && (e += h), (0 > h || !a.isNumeric(h) && !h) && (i = c.ui.spanError(c, f), i.length > 0 && c.instances.errors.push(i))) } }), e } }(a, c); try { module && module.exports && (module.exports = c) } catch (e) { } var f = {}; f.common = {}, f.common.minChar = 6, f.common.usernameField = "#username", f.common.userInputs = [], f.common.onLoad = void 0, f.common.onKeyUp = void 0, f.common.zxcvbn = !1, f.common.zxcvbnTerms = [], f.common.events = ["keyup", "change", "paste"], f.common.debug = !1, f.rules = {}, f.rules.extra = {}, f.rules.scores = { wordNotEmail: -100, wordLength: -50, wordSimilarToUsername: -100, wordSequences: -20, wordTwoCharacterClasses: 2, wordRepetitions: -25, wordLowercase: 1, wordUppercase: 3, wordOneNumber: 3, wordThreeNumbers: 5, wordOneSpecialChar: 3, wordTwoSpecialChar: 5, wordUpperLowerCombo: 2, wordLetterNumberCombo: 2, wordLetterNumberCharCombo: 2 }, f.rules.activated = { wordNotEmail: !0, wordLength: !0, wordSimilarToUsername: !0, wordSequences: !0, wordTwoCharacterClasses: !1, wordRepetitions: !1, wordLowercase: !0, wordUppercase: !0, wordOneNumber: !0, wordThreeNumbers: !0, wordOneSpecialChar: !0, wordTwoSpecialChar: !0, wordUpperLowerCombo: !0, wordLetterNumberCombo: !0, wordLetterNumberCharCombo: !0 }, f.rules.raisePower = 1.4, f.ui = {}, f.ui.bootstrap2 = !1, f.ui.bootstrap4 = !1, f.ui.colorClasses = ["danger", "danger", "danger", "warning", "warning", "success"], f.ui.showProgressBar = !0, f.ui.progressBarEmptyPercentage = 1, f.ui.progressBarMinPercentage = 1, f.ui.progressBarExtraCssClasses = "", f.ui.showPopover = !1, f.ui.popoverPlacement = "bottom", f.ui.showStatus = !1, f.ui.spanError = function (a, b) { "use strict"; var c = a.i18n.t(b); return c ? '<span style="color: #d52929">' + c + "</span>" : "" }, f.ui.popoverError = function (b) { "use strict"; var c = b.instances.errors, d = b.i18n.t("errorList"), e = "<div>" + d + "<ul class='error-list' style='margin-bottom: 0;'>"; return a.each(c, function (a, b) { e += "<li>" + b + "</li>" }), e += "</ul></div>" }, f.ui.showVerdicts = !0, f.ui.showVerdictsInsideProgressBar = !1, f.ui.useVerdictCssClass = !1, f.ui.showErrors = !1, f.ui.showScore = !1, f.ui.container = void 0, f.ui.viewports = { progress: void 0, verdict: void 0, errors: void 0, score: void 0 }, f.ui.scores = [0, 14, 26, 38, 50], f.i18n = {}, f.i18n.t = b.t; var g = {}; !function (a, b) { "use strict"; var c = ["error", "warning", "success"], d = ["veryWeak", "weak", "normal", "medium", "strong", "veryStrong"]; b.getContainer = function (b, c) { var d; return d = a(b.ui.container), d && 1 === d.length || (d = c.parent()), d }, b.findElement = function (a, b, c) { return b ? a.find(b).find(c) : a.find(c) }, b.getUIElements = function (a, c) { var d, e, f; return a.instances.viewports ? a.instances.viewports : (d = b.getContainer(a, c), f = {}, e = a.ui.bootstrap4 ? "progress.progress" : "div.progress", f.$progressbar = b.findElement(d, a.ui.viewports.progress, e), a.ui.showVerdictsInsideProgressBar && (f.$verdict = f.$progressbar.find("span.password-verdict")), a.ui.showPopover || (a.ui.showVerdictsInsideProgressBar || (f.$verdict = b.findElement(d, a.ui.viewports.verdict, "span.password-verdict")), f.$errors = b.findElement(d, a.ui.viewports.errors, "ul.error-list")), f.$score = b.findElement(d, a.ui.viewports.score, "span.password-score"), a.instances.viewports = f, f) }, b.initProgressBar = function (c, d) { var e = b.getContainer(c, d), f = "<div class='progress "; c.ui.bootstrap2 ? f += c.ui.progressBarExtraCssClasses + "'><div class='" : c.ui.bootstrap2 || c.ui.bootstrap4 || (f += "'><div class='" + c.ui.progressBarExtraCssClasses + " progress-"), f += "bar'>", c.ui.bootstrap4 && (f = "<progress class='progress " + c.ui.progressBarExtraCssClasses + "' value='0' max='100'>"), c.ui.showVerdictsInsideProgressBar && (f += "<span class='password-verdict'></span>"), f += c.ui.bootstrap4 ? "</progress>" : "</div></div>", c.ui.viewports.progress ? e.find(c.ui.viewports.progress).append(f) : a(f).insertAfter(d) }, b.initHelper = function (c, d, e, f) { var g = b.getContainer(c, d); f ? g.find(f).append(e) : a(e).insertAfter(d) }, b.initVerdict = function (a, c) { b.initHelper(a, c, "<span class='password-verdict'></span>", a.ui.viewports.verdict) }, b.initErrorList = function (a, c) { b.initHelper(a, c, "<ul class='error-list'></ul>", a.ui.viewports.errors) }, b.initScore = function (a, c) { b.initHelper(a, c, "<span class='password-score'></span>", a.ui.viewports.score) }, b.initPopover = function (a, b) { b.popover("destroy"), b.popover({ html: !0, placement: a.ui.popoverPlacement, trigger: "manual", content: " " }) }, b.initUI = function (a, c) { a.ui.showPopover ? b.initPopover(a, c) : (a.ui.showErrors && b.initErrorList(a, c), a.ui.showVerdicts && !a.ui.showVerdictsInsideProgressBar && b.initVerdict(a, c)), a.ui.showProgressBar && b.initProgressBar(a, c), a.ui.showScore && b.initScore(a, c) }, b.updateProgressBar = function (c, d, e, f) { var g = b.getUIElements(c, d).$progressbar, h = g.find(".progress-bar"), i = "progress-"; c.ui.bootstrap2 && (h = g.find(".bar"), i = ""), a.each(c.ui.colorClasses, function (a, b) { c.ui.bootstrap4 ? g.removeClass(i + b) : h.removeClass(i + "bar-" + b) }), c.ui.bootstrap4 ? (g.addClass(i + c.ui.colorClasses[e]), g.val(f)) : (h.addClass(i + "bar-" + c.ui.colorClasses[e]), h.css("width", f + "%")) }, b.updateVerdict = function (a, c, d, e) { var f = b.getUIElements(a, c).$verdict; f.removeClass(a.ui.colorClasses.join(" ")), d > -1 && f.addClass(a.ui.colorClasses[d]), f.html(e) }, b.updateErrors = function (c, d, e) { var f = b.getUIElements(c, d).$errors, g = ""; e || a.each(c.instances.errors, function (a, b) { g += "<li>" + b + "</li>" }), f.html(g) }, b.updateScore = function (a, c, d, e) { var f = b.getUIElements(a, c).$score, g = ""; e || (g = d.toFixed(2)), f.html(g) }, b.updatePopover = function (a, b, c, d) { var e = b.data("bs.popover"), f = "", g = !0; return a.ui.showVerdicts && !a.ui.showVerdictsInsideProgressBar && c.length > 0 && (f = "<h5><span class='password-verdict'>" + c + "</span></h5>", g = !1), a.ui.showErrors && (a.instances.errors.length > 0 && (g = !1), f += a.ui.popoverError(a)), g || d ? void b.popover("hide") : (a.ui.bootstrap2 && (e = b.data("popover")), void (e.$arrow && e.$arrow.parents("body").length > 0 ? b.find("+ .popover .popover-content").html(f) : (e.options.content = f, b.popover("show")))) }, b.updateFieldStatus = function (b, d, e, f) { var g = b.ui.bootstrap2 ? ".control-group" : ".form-group", h = d.parents(g).first(); a.each(c, function (a, c) { b.ui.bootstrap2 || (c = "has-" + c), h.removeClass(c) }), f || (e = c[e], b.ui.bootstrap2 || (e = "has-" + e), h.addClass(e)) }, b.percentage = function (a, b, c) { var d = Math.floor(100 * b / c), e = a.ui.progressBarMinPercentage; return d = e >= d ? e : d, d = d > 100 ? 100 : d }, b.getVerdictAndCssClass = function (a, b) { var c, e; return void 0 === b ? ["", 0] : (c = b <= a.ui.scores[0] ? 0 : b < a.ui.scores[1] ? 1 : b < a.ui.scores[2] ? 2 : b < a.ui.scores[3] ? 3 : b < a.ui.scores[4] ? 4 : 5, e = d[c], [a.i18n.t(e), c]) }, b.updateUI = function (a, c, d) { var e, f, g, h; e = b.getVerdictAndCssClass(a, d), g = 0 === d ? "" : e[0], e = e[1], h = a.ui.useVerdictCssClass ? e : -1, a.ui.showProgressBar && (f = void 0 === d ? a.ui.progressBarEmptyPercentage : b.percentage(a, d, a.ui.scores[4]), b.updateProgressBar(a, c, e, f), a.ui.showVerdictsInsideProgressBar && b.updateVerdict(a, c, h, g)), a.ui.showStatus && b.updateFieldStatus(a, c, e, void 0 === d), a.ui.showPopover ? b.updatePopover(a, c, g, void 0 === d) : (a.ui.showVerdicts && !a.ui.showVerdictsInsideProgressBar && b.updateVerdict(a, c, h, g), a.ui.showErrors && b.updateErrors(a, c, void 0 === d)), a.ui.showScore && b.updateScore(a, c, d, void 0 === d) } }(a, g); var h = {}; !function (a, b) { "use strict"; var d, e, h; d = function (b) { var d, e, f, h, i = a(b.target), j = i.data("pwstrength-bootstrap"), k = i.val(); void 0 !== j && (j.instances.errors = [], 0 === k.length ? h = void 0 : j.common.zxcvbn ? (d = [], a.each(j.common.userInputs.concat([j.common.usernameField]), function (b, c) { var e = a(c).val(); e && d.push(e) }), d = d.concat(j.common.zxcvbnTerms), h = Math.log2(zxcvbn(k, d).guesses)) : h = c.executeRules(j, k), g.updateUI(j, i, h), e = g.getVerdictAndCssClass(j, h), f = e[1], e = e[0], j.common.debug && console.log(h + " - " + e), a.isFunction(j.common.onKeyUp) && j.common.onKeyUp(b, { score: h, verdictText: e, verdictLevel: f })) }, e = function (b) { var c, e = a(b.target), f = e.val(), g = 0; c = function () { var a = e.val(); a !== f ? d(b) : 3 > g && (g += 1, setTimeout(c, 100)) }, setTimeout(c, 100) }, b.init = function (b) { return this.each(function (c, h) { var i = a.extend(!0, {}, f), j = a.extend(!0, i, b), k = a(h); j.instances = {}, k.data("pwstrength-bootstrap", j), a.each(j.common.events, function (a, b) { var c = "paste" === b ? e : d; k.on(b, c) }), g.initUI(j, k), k.trigger("keyup"), a.isFunction(j.common.onLoad) && j.common.onLoad() }), this }, b.destroy = function () { this.each(function (b, c) { var d = a(c), e = d.data("pwstrength-bootstrap"), f = g.getUIElements(e, d); f.$progressbar.remove(), f.$verdict.remove(), f.$errors.remove(), d.removeData("pwstrength-bootstrap") }) }, b.forceUpdate = function () { this.each(function (a, b) { var c = { target: b }; d(c) }) }, b.addRule = function (b, c, d, e) { this.each(function (f, g) { var h = a(g).data("pwstrength-bootstrap"); h.rules.activated[b] = e, h.rules.scores[b] = d, h.rules.extra[b] = c }) }, h = function (b, c, d) { this.each(function (e, f) { a(f).data("pwstrength-bootstrap").rules[c][b] = d }) }, b.changeScore = function (a, b) { h.call(this, a, "scores", b) }, b.ruleActive = function (a, b) { h.call(this, a, "activated", b) }, a.fn.pwstrength = function (c) { var d; return b[c] ? d = b[c].apply(this, Array.prototype.slice.call(arguments, 1)) : "object" != typeof c && c ? a.error("Method " + c + " does not exist on jQuery.pwstrength-bootstrap") : d = b.init.apply(this, arguments), d } }(a, h) }(jQuery);
//# sourceMappingURL=pwstrength-bootstrap.min.map