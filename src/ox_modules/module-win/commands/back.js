/*
 * Copyright (C) 2015-present CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
 
/**
 * @summary Navigate backwards in the browser history or simulates back button on Android device.
 * @function back
 * @for android, hybrid, web
 * @example <caption>[javascript] Usage example</caption>
 * win.init(caps);//Starts a mobile session and opens app from desired capabilities
 * win.click("id=NextPage);// Clicks an element and opens an alert.
 * win.back();//Navigate back to previous page.
 */
module.exports = function() {
    this.driver.back();
};