/*
 * Copyright (C) 2015-present CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
 
/**
 * @summary Perform right click on an element.
 * @function rightClick
 * @param {String|Element} locator - An element locator.
 * @param {Number=} timeout - Timeout in milliseconds. Default is 60 seconds.
 */
module.exports = function(locator, timeout) {
    this.helpers.assertArgumentTimeout(timeout, 'timeout');
    
    var el = this.helpers.getElement(locator, false, timeout);

    const { width, height } = this.driver.getElementSize(el.elementId);
    this.driver.moveToElement(el.elementId, width / 2, height / 2);
    this.driver.positionClick(2);
};