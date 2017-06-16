/*
 * Copyright (C) 2015-2017 CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
/**
 * @summary Clicks hidden element.
 * @function clickHidden
 * @param {String} locator - Element locator.
 * @param {Boolean=} clickParent - If true, then parent of the element is clicked.
*/
module.exports = function(locator, clickParent) {
    this.helpers._assertLocator(locator);
    clickParent = typeof clickParent === 'boolean' ? clickParent : false;
    locator = this.helpers.getWdioLocator(locator);

    this._driver.selectorExecute(
        locator,
        function(elms, clickParent) {
            var elm = elms && elms.length > 0 ? elms[0] : null;
            if (!elm) {
                return;
            }
            /*global document*/
            var clck_ev = document.createEvent('MouseEvent');
            clck_ev.initEvent('click', true, true);
            if (clickParent) {
                elm.parentElement.dispatchEvent(clck_ev);
            } else {
                elm.dispatchEvent(clck_ev);
            }
        },
        clickParent
    );
};

