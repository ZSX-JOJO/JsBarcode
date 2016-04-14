"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// ASCII value ranges 0-127, 200-211
var validCODE128 = /^[\x00-\x7F\xC8-\xD3]+$/;

// This is the master class, it does require the start code to be
//included in the string

var CODE128 = function () {
	function CODE128(string) {
		_classCallCheck(this, CODE128);

		// Fill the bytes variable with the ascii codes of string
		this.bytes = [];
		for (var i = 0; i < string.length; ++i) {
			this.bytes.push(string.charCodeAt(i));
		}

		// First element should be startcode, remove that
		this.string = string.substring(1);

		//Data for each character, the last characters will not be encoded but are used for error correction
		//Numbers encode to (n + 1000) -> binary; 740 -> (740 + 1000).toString(2) -> "11011001100"
		this.encodings = [// + 1000
		740, 644, 638, 176, 164, 100, 224, 220, 124, 608, 604, 572, 436, 244, 230, 484, 260, 254, 650, 628, 614, 764, 652, 902, 868, 836, 830, 892, 844, 842, 752, 734, 590, 304, 112, 94, 416, 128, 122, 672, 576, 570, 464, 422, 134, 496, 478, 142, 910, 678, 582, 768, 762, 774, 880, 862, 814, 896, 890, 818, 914, 602, 930, 328, 292, 200, 158, 68, 62, 424, 412, 232, 218, 76, 74, 554, 616, 978, 556, 146, 340, 212, 182, 508, 268, 266, 956, 940, 938, 758, 782, 974, 400, 310, 118, 512, 506, 960, 954, 502, 518, 886, 966, /* Start codes */668, 680, 692, 5379];
	}

	_createClass(CODE128, [{
		key: "getText",
		value: function getText() {
			var string = this.string;

			/*
   string = string.replace(String.fromCharCode(201), "[FNC3]");
   string = string.replace(String.fromCharCode(202), "[FNC2]");
   string = string.replace(String.fromCharCode(203), "[SHIFT]");
   string = string.replace(String.fromCharCode(207), "[FNC1]");
   */

			return string.replace(/[^\x20-\x7E]/g, "");
		}

		// The public encoding function

	}, {
		key: "encode",
		value: function encode() {
			var encodingResult;
			var bytes = this.bytes;
			// Remove the startcode from the bytes and set its index
			var startIndex = bytes.shift() - 105;

			// Start encode with the right type
			if (startIndex === 103) {
				encodingResult = this.nextA(bytes, 1);
			} else if (startIndex === 104) {
				encodingResult = this.nextB(bytes, 1);
			} else if (startIndex === 105) {
				encodingResult = this.nextC(bytes, 1);
			}

			return { text: this.getText(),
				data:
				//Add the start bits
				this.getEncoding(startIndex) +
				//Add the encoded bits
				encodingResult.result +
				//Add the checksum
				this.getEncoding((encodingResult.checksum + startIndex) % 103) +
				//Add the end bits
				this.getEncoding(106)
			};
		}
	}, {
		key: "getEncoding",
		value: function getEncoding(n) {
			return this.encodings[n] ? (this.encodings[n] + 1000).toString(2) : '';
		}

		// Use the regexp variable for validation

	}, {
		key: "valid",
		value: function valid() {
			return this.string.search(validCODE128) !== -1;
		}
	}, {
		key: "nextA",
		value: function nextA(bytes, depth) {
			if (bytes.length <= 0) {
				return { "result": "", "checksum": 0 };
			}

			var next, index;

			// Special characters
			if (bytes[0] >= 200) {
				index = bytes[0] - 105;

				//Remove first element
				bytes.shift();

				// Swap to CODE128C
				if (index === 99) {
					next = this.nextC(bytes, depth + 1);
				}
				// Swap to CODE128B
				else if (index === 100) {
						next = this.nextB(bytes, depth + 1);
					}
					// Shift
					else if (index === 98) {
							// Convert the next character so that is encoded correctly
							bytes[0] = bytes[0] > 95 ? bytes[0] - 96 : bytes[0];
							next = this.nextA(bytes, depth + 1);
						}
						// Continue on CODE128A but encode a special character
						else {
								next = this.nextA(bytes, depth + 1);
							}
			}
			// Continue encoding of CODE128A
			else {
					var charCode = bytes[0];
					index = charCode < 32 ? charCode + 64 : charCode - 32;

					// Remove first element
					bytes.shift();

					next = this.nextA(bytes, depth + 1);
				}

			// Get the correct binary encoding and calculate the weight
			var enc = this.getEncoding(index);
			var weight = index * depth;

			return {
				"result": enc + next.result,
				"checksum": weight + next.checksum
			};
		}
	}, {
		key: "nextB",
		value: function nextB(bytes, depth) {
			if (bytes.length <= 0) {
				return { "result": "", "checksum": 0 };
			}

			var next, index;

			// Special characters
			if (bytes[0] >= 200) {
				index = bytes[0] - 105;

				//Remove first element
				bytes.shift();

				// Swap to CODE128C
				if (index === 99) {
					next = this.nextC(bytes, depth + 1);
				}
				// Swap to CODE128A
				else if (index === 101) {
						next = this.nextA(bytes, depth + 1);
					}
					// Shift
					else if (index === 98) {
							// Convert the next character so that is encoded correctly
							bytes[0] = bytes[0] < 32 ? bytes[0] + 96 : bytes[0];
							next = this.nextB(bytes, depth + 1);
						}
						// Continue on CODE128B but encode a special character
						else {
								next = this.nextB(bytes, depth + 1);
							}
			}
			// Continue encoding of CODE128B
			else {
					index = bytes[0] - 32;
					bytes.shift();
					next = this.nextB(bytes, depth + 1);
				}

			// Get the correct binary encoding and calculate the weight
			var enc = this.getEncoding(index);
			var weight = index * depth;

			return { "result": enc + next.result, "checksum": weight + next.checksum };
		}
	}, {
		key: "nextC",
		value: function nextC(bytes, depth) {
			if (bytes.length <= 0) {
				return { "result": "", "checksum": 0 };
			}

			var next, index;

			// Special characters
			if (bytes[0] >= 200) {
				index = bytes[0] - 105;

				// Remove first element
				bytes.shift();

				// Swap to CODE128B
				if (index === 100) {
					next = this.nextB(bytes, depth + 1);
				}
				// Swap to CODE128A
				else if (index === 101) {
						next = this.nextA(bytes, depth + 1);
					}
					// Continue on CODE128C but encode a special character
					else {
							next = this.nextC(bytes, depth + 1);
						}
			}
			// Continue encoding of CODE128C
			else {
					index = (bytes[0] - 48) * 10 + bytes[1] - 48;
					bytes.shift();
					bytes.shift();
					next = this.nextC(bytes, depth + 1);
				}

			// Get the correct binary encoding and calculate the weight
			var enc = this.getEncoding(index);
			var weight = index * depth;

			return { "result": enc + next.result, "checksum": weight + next.checksum };
		}
	}]);

	return CODE128;
}();

function autoSelectModes(string) {
	// ASCII ranges 0-98 and 200-207 (FUNCs and SHIFTs)
	var aLength = string.match(/^[\x00-\x5F\xC8-\xCF]*/)[0].length;
	// ASCII ranges 32-127 and 200-207 (FUNCs and SHIFTs)
	var bLength = string.match(/^[\x20-\x7F\xC8-\xCF]*/)[0].length;
	// Number pairs or [FNC1]
	var cLength = string.match(/^(\xCF*[0-9]{2}\xCF*)*/)[0].length;

	var newString;
	// Select CODE128C if the string start with enough digits
	if (cLength >= 2) {
		newString = String.fromCharCode(210) + autoSelectFromC(string);
	}
	// Select A/C depending on the longest match
	else if (aLength > bLength) {
			newString = String.fromCharCode(208) + autoSelectFromA(string);
		} else {
			newString = String.fromCharCode(209) + autoSelectFromB(string);
		}

	newString = newString.replace(/[\xCD\xCE]([^])[\xCD\xCE]/, function (match, char) {
		return String.fromCharCode(203) + char;
	});

	return newString;
}

function autoSelectFromA(string) {
	var untilC = string.match(/^([\x00-\x5F\xC8-\xCF]+?)(([0-9]{2}){2,})([^0-9]|$)/);

	if (untilC) {
		return untilC[1] + String.fromCharCode(204) + autoSelectFromC(string.substring(untilC[1].length));
	}

	var aChars = string.match(/^[\x00-\x5F\xC8-\xCF]+/);
	if (aChars[0].length === string.length) {
		return string;
	}

	return aChars[0] + String.fromCharCode(205) + autoSelectFromB(string.substring(aChars[0].length));
}

function autoSelectFromB(string) {
	var untilC = string.match(/^([\x20-\x7F\xC8-\xCF]+?)(([0-9]{2}){2,})([^0-9]|$)/);

	if (untilC) {
		return untilC[1] + String.fromCharCode(204) + autoSelectFromC(string.substring(untilC[1].length));
	}

	var bChars = string.match(/^[\x20-\x7F\xC8-\xCF]+/);
	if (bChars[0].length === string.length) {
		return string;
	}

	return bChars[0] + String.fromCharCode(206) + autoSelectFromA(string.substring(bChars[0].length));
}

function autoSelectFromC(string) {
	var cMatch = string.match(/^(\xCF*[0-9]{2}\xCF*)+/)[0];
	var length = cMatch.length;

	if (length === string.length) {
		return string;
	}

	string = string.substring(length);

	// Select A/B depending on the longest match
	var aLength = string.match(/^[\x00-\x5F\xC8-\xCF]*/)[0].length;
	var bLength = string.match(/^[\x20-\x7F\xC8-\xCF]*/)[0].length;
	if (aLength >= bLength) {
		return cMatch + String.fromCharCode(206) + autoSelectFromA(string);
	} else {
		return cMatch + String.fromCharCode(205) + autoSelectFromB(string);
	}
}

var CODE128AUTO = function (_CODE) {
	_inherits(CODE128AUTO, _CODE);

	function CODE128AUTO(string) {
		_classCallCheck(this, CODE128AUTO);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(CODE128AUTO).call(this, string));

		if (string.search(validCODE128) !== -1) {
			var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(CODE128AUTO).call(this, autoSelectModes(string)));
		} else {
			var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(CODE128AUTO).call(this, string));
		}
		return _possibleConstructorReturn(_this);
	}

	return CODE128AUTO;
}(CODE128);

var CODE128A = function (_CODE2) {
	_inherits(CODE128A, _CODE2);

	function CODE128A(string) {
		_classCallCheck(this, CODE128A);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(CODE128A).call(this, String.fromCharCode(208) + string));
	}

	_createClass(CODE128A, [{
		key: "valid",
		value: function valid() {
			return this.string.search(/^[\x00-\x5F\xC8-\xCF]+$/) !== -1;
		}
	}]);

	return CODE128A;
}(CODE128);

var CODE128B = function (_CODE3) {
	_inherits(CODE128B, _CODE3);

	function CODE128B(string) {
		_classCallCheck(this, CODE128B);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(CODE128B).call(this, String.fromCharCode(209) + string));
	}

	_createClass(CODE128B, [{
		key: "valid",
		value: function valid() {
			return this.string.search(/^[\x20-\x7F\xC8-\xCF]+$/) !== -1;
		}
	}]);

	return CODE128B;
}(CODE128);

var CODE128C = function (_CODE4) {
	_inherits(CODE128C, _CODE4);

	function CODE128C(string) {
		_classCallCheck(this, CODE128C);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(CODE128C).call(this, String.fromCharCode(210) + string));
	}

	_createClass(CODE128C, [{
		key: "valid",
		value: function valid() {
			return this.string.search(/^(\xCF*[0-9]{2}\xCF*)+$/) !== -1;
		}
	}]);

	return CODE128C;
}(CODE128);

exports.CODE128 = CODE128;
exports.CODE128A = CODE128A;
exports.CODE128B = CODE128B;
exports.CODE128C = CODE128C;