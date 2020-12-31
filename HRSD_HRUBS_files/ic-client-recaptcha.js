/***
 * -Call the init_client_recaptcha() function on window.onload or $(document).ready() or $(function() {});
 * -RECAPTCHA button must have class "ic-button-primary-recaptcha" and cannot have javascript to disable itself on client click
 * -RECATPCHA hidden field for the token must have id "hdnReCAPTCHAToken"
 * -RECAPTCHA in order to work, this script must be loaded before the recaptcha api one
 *  Because the ADA client-side validation binds to submit button events (for postbacks), we replicate that here and
 *   replace the class ADA looks for to prevent conflicts. Any updates to the ADA js should occur here, too, if needed. 
 * */

$(function () {
    $.fn.getType = function () { return this.prop('nodeName') === "INPUT" ? this[0].type.toLowerCase() : this[0].tagName.toLowerCase(); };
    $.fn.hasAttr = function (name) { return typeof this.attr(name) !== "undefined"; };
    $.fn.hasError = function () { return typeof this.attr("aria-invalid") !== "undefined" && this.attr("aria-invalid") === "true"; };
});

function init_client_recaptcha() {
    var reCAPTCHA_button = $('.ic-button-primary-recaptcha');
    //bind listeners for every button, if there's more than one
    reCAPTCHA_button.each(function () {
        bindReCAPTCHAListeners($(this));
    });
};

function bindReCAPTCHAListeners(button) {
    if (!button.hasClass("bound")) {
        updateReCAPTCHABindings(button);
        button.addClass("bound");
    }
};

function updateReCAPTCHABindings(button) {
    if (typeof button.attr("id") !== 'undefined') {
        // Enter/Space/Click on button
        button.on("keypress." + button.attr("id"), subOnKeyPressReCATPCHA);
        button.on("click." + button.attr("id"), subOnClickReCATPCHA);

        // Global "Hit Enter"
        $(document).on("keypress." + button.attr("id"), subOnEnterReCATPCHA);
    }

    function subOnKeyPressReCATPCHA(e) {
        var keycode = getKeyCode(e);

        if (keycode === 13 || keycode === 32) {
            console.log("subOnKeyPressReCATPCHA event called!");
            if (!hasNoErrors()) {
                e.preventDefault();
            }
            else {
                $("input[id$='hdnSubmitterButtonID']").val(button.attr("id"));
                grecaptcha.execute();
                e.preventDefault();
            }
        }
    };

    function subOnClickReCATPCHA(e) {
        if (!hasNoErrors()) {
            e.preventDefault();
        }
        else {
            $("input[id$='hdnSubmitterButtonID']").val(button.attr("id"));
            grecaptcha.execute();
            e.preventDefault();
        }
    };

    function subOnEnterReCATPCHA(e) {
        var keycode = getKeyCode(e);

        if (keycode === 13) {
            if (!hasNoErrors()) {
                e.preventDefault();
            }
            else {
                $("input[id$='hdnSubmitterButtonID']").val(button.attr("id"));
                grecaptcha.execute();
                e.preventDefault();
            }
        }
    };
};

function disableReCAPTCHAButton(button) {
    if (!button.hasAttr("aria-disabled")) {
        if (button.outerWidth() >= 109) {
            button.css("width", button.outerWidth() + "px");
        }

        addAttributeValue(button, "aria-disabled", "true");
        button.css({ "opacity": ".65", "cursor": "not-allowed" })
            .html("Please wait...");

        clearWellError();
    }
};

function getKeyCode(event) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (event) keycode = event.which;

    return keycode;
};

function addAttributeValue(target, attribute, value) {
    if (target.hasAttr(attribute)) {
        if (target.attr(attribute).indexOf(value) === -1) {
            target.attr(attribute, target.attr(attribute) + ' ' + value);
        }
    }
    else {
        target.attr(attribute, value);
    }
};

function clearWellError() {
    $('.alert-dismissible').remove();
};

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
    else if (typeof logicalErrorMsg !== "undefined" && logicalErrorMsg.length) {
        throwWellError("ic-error-message", logicalErrorMsg);
        noErrors = false;
    }

    return noErrors;
};

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
};

function addErrorMarkup(well) {
    var error;
    error = '<div role="alert" class="alert alert-danger alert-dismissible sso-alert-danger"><p>';
    error += '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span></button>';
    error += '<span id="ic-well-message"></span>';
    error += '</p></div>';
    well.append(error);
};

function clearAllErrors() {
    $(".has-ic-error").each(function () {
        var target = $(this).find(':input');
        clearError(target);
    });
};

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
};

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
};

function testForError(target) {
    target.focus().keyup().blur();
};

//============================================
// reCAPTCHA Callbacks
//============================================ 

function reCAPTCHASuccess(token) {
    //when the reCAPTCHA succeeds

    //We are getting the button this way to uniquely identify which one triggered the recaptcha
    //in case 2 or more buttons are on the page.
    //This will let us execute correct logic in code-behind depending on button that triggers the postback.
    var submitterButton = $("#" + $("input[id$='hdnSubmitterButtonID']").val());
    var submitterButtonID = submitterButton.attr("id").replace(/\_/g, "$");
    disableReCAPTCHAButton(submitterButton);

    $("input[id$='hdnReCAPTCHAToken']").val(token);

    __doPostBack('' + submitterButtonID + '', '');
};

function reCAPTCHAExpired() {
    //when the reCAPTCHA expired

    //We are getting the button this way to uniquely identify which one triggered the recaptcha
    //in case 2 or more buttons are on the page.
    //This will let us execute correct logic in code-behind depending on button that triggers the postback.
    var submitterButton = $("#" + $("input[id$='hdnSubmitterButtonID']").val());
    var submitterButtonID = submitterButton.attr("id").replace(/\_/g, "$");
    disableReCAPTCHAButton(submitterButton);

    $("input[id$='hdnReCAPTCHAToken']").val("1");

    __doPostBack('' + submitterButtonID + '', '');
};

function reCAPTCHAError() {
    //when the reCAPTCHA encounters an error; usually network connectivity

    //We are getting the button this way to uniquely identify which one triggered the recaptcha
    //in case 2 or more buttons are on the page.
    //This will let us execute correct logic in code-behind depending on button that triggers the postback.
    var submitterButton = $("#" + $("input[id$='hdnSubmitterButtonID']").val());
    var submitterButtonID = submitterButton.attr("id").replace(/\_/g, "$");
    disableReCAPTCHAButton(submitterButton);

    $("input[id$='hdnReCAPTCHAToken']").val("0");

    __doPostBack('' + submitterButtonID + '', '');
};