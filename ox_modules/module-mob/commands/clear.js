/*
 * Copyright (C) 2015-2017 CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
/**
 * @summary Clears element's value or content
 * @function clear
 * @param {String} locator - Element locator.
 */

module.exports = function(locator) {
    this.helpers._assertLocator(locator);
    locator = this.helpers.getWdioLocator(locator);
    return this._driver.clearElement(locator);
};
