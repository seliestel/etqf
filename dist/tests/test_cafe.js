// testcafe 'path:`/mnt/c/Program Files/Mozilla Firefox/firefox.exe`' tests/test_cafe.js

import { Selector } from 'testcafe';

fixture `Getting Started`
    .page `https://etqf.herokuapp.com`;

test('My first test', async t => {
	console.log("Running test");
    // Test code
});