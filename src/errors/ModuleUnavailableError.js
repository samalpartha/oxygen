/*
 * Copyright (C) 2015-present CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/*
 * Oxygen module is not available (e.g. ODBC due to missing libs)
 */
function ModuleUnavailableError(message) {
    this.message = message;
}

module.exports = ModuleUnavailableError;
