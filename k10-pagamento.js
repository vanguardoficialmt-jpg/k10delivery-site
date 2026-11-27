/* K10 Delivery · pagamento online no checkout
   Pix QR Code e Pix copia e cola (gerados no próprio site, com a chave Pix da K10)
   e cartão de crédito pela página segura da InfinitePay (Checkout Integrado).
   Configuração: window.K10_PAG em k10-config.js. */
/* QR Code para JavaScript · (c) 2009 Kazuhiko Arase · licença MIT · http://www.d-project.com/ */
var K10QR=(function(){var M={};function req(n){n=n.replace(/^\.\//,"").replace(/\.js$/,"");if(n==="."||n==="")n="index";return M[n]}
(function(){var module={exports:{}};module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

M['QRMode']=module.exports;})();
(function(){var module={exports:{}};module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


M['QRErrorCorrectLevel']=module.exports;})();
(function(){var module={exports:{}};module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

M['QRMaskPattern']=module.exports;})();
(function(){var module={exports:{}};var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

M['QRMath']=module.exports;})();
(function(){var module={exports:{}};var QRMath = req('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

M['QRPolynomial']=module.exports;})();
(function(){var module={exports:{}};var QRErrorCorrectLevel = req('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

M['QRRSBlock']=module.exports;})();
(function(){var module={exports:{}};function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

M['QRBitBuffer']=module.exports;})();
(function(){var module={exports:{}};var QRMode = req('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

M['QR8bitByte']=module.exports;})();
(function(){var module={exports:{}};var QRMode = req('./QRMode');
var QRPolynomial = req('./QRPolynomial');
var QRMath = req('./QRMath');
var QRMaskPattern = req('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

M['QRUtil']=module.exports;})();
(function(){var module={exports:{}};//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = req('./QR8bitByte');
var QRUtil = req('./QRUtil');
var QRPolynomial = req('./QRPolynomial');
var QRRSBlock = req('./QRRSBlock');
var QRBitBuffer = req('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

M['index']=module.exports;})();
return {QRCode:M.index,ECL:M.QRErrorCorrectLevel};})();
/* Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central) */
var K10Pix=(function(){
 function semAcento(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9 .\-\/@+]/g,'').trim()}
 function campo(id,valor){valor=String(valor);var n=valor.length;if(n>99)throw Error('Campo '+id+' grande demais');return id+(n<10?'0':'')+n+valor}
 function crc16(str){var crc=0xFFFF;for(var i=0;i<str.length;i++){crc^=str.charCodeAt(i)<<8;for(var b=0;b<8;b++){crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1);crc&=0xFFFF}}return crc.toString(16).toUpperCase().padStart(4,'0')}
 function normalizarChave(chave,tipo){var c=String(chave||'').trim();
  if(tipo==='email'){c=c.toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c))throw Error('E-mail da chave Pix inválido.');return c}
  if(tipo==='aleatoria'){c=c.toLowerCase();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(c))throw Error('Chave aleatória inválida (formato 8-4-4-4-12).');return c}
  if(tipo==='celular'){var d=c.replace(/\D/g,'');if(d.length===10||d.length===11)d='55'+d;if(!/^55\d{10,11}$/.test(d))throw Error('Celular da chave Pix inválido. Use DDD + número.');return '+'+d}
  var dg=c.replace(/\D/g,'');if(dg.length!==11&&dg.length!==14)throw Error('CPF/CNPJ da chave Pix inválido.');return dg}
 function gerar(o){var chave=normalizarChave(o.chave,o.tipo);
  var nome=semAcento(o.nome||'K10 DELIVERY').toUpperCase().slice(0,25)||'K10 DELIVERY';
  var cidade=semAcento(o.cidade||'CUIABA').toUpperCase().slice(0,15)||'CUIABA';
  var txid=String(o.txid||'***').replace(/[^A-Za-z0-9]/g,'').slice(0,25)||'***';
  var conta=campo('00','br.gov.bcb.pix')+campo('01',chave);
  var p=campo('00','01')+campo('26',conta)+campo('52','0000')+campo('53','986');
  if(o.valor){var v=Number(o.valor);if(!(v>0))throw Error('Valor inválido.');p+=campo('54',v.toFixed(2))}
  p+=campo('58','BR')+campo('59',nome)+campo('60',cidade)+campo('62',campo('05',txid))+'6304';
  return p+crc16(p)}
 return {gerar:gerar,crc16:crc16,normalizarChave:normalizarChave};
})();
/* ===== Pagamento online no checkout K10 ===== */
(function(){
'use strict';
var CFG=window.K10_PAG||{};
var TAG=String(CFG.infinitetag||'').trim().replace(/^\$/,'').trim();
var PIX={chave:String(CFG.pixChave||'').trim(),tipo:String(CFG.pixTipo||'cnpj').toLowerCase(),nome:CFG.pixNome||'K10 DELIVERY',cidade:CFG.pixCidade||'CUIABA'};
var PIX_OK=false;
if(PIX.chave){try{K10Pix.normalizarChave(PIX.chave,PIX.tipo);PIX_OK=true}catch(e){console.warn('K10 Pix: chave Pix inválida em k10-config.js ·',e.message)}}
var CARD_OK=!!TAG;
var CLIENTE=(window.K10_MODE||'cliente')!=='equipe';
var API='https://api.checkout.infinitepay.io';
var FINAL=['cancelado','entregue','retirado','finalizado'];

var KINDS={
 pix_qr:{pay:'pix',online:true,icon:'📷',t:'Pix QR Code',s:'Escaneie o QR Code no app do banco'},
 pix_copia:{pay:'pix',online:true,icon:'📋',t:'Pix copia e cola',s:'Copie o código e cole no app do banco'},
 credito:{pay:'cartao',online:true,icon:'💳',t:'Cartão de crédito',s:'Pague pelo site em até 12x'},
 dinheiro:{pay:'dinheiro',icon:'💵',t:'Dinheiro',s:'Informe se precisa de troco'},
 maquininha:{pay:'cartao',icon:'🏧',t:'Cartão na maquininha',s:'Débito ou crédito'},
 pix_entrega:{pay:'pix',icon:'📲',t:'Pix na hora',s:'O entregador mostra o QR Code'}
};
function onlineKinds(){var l=[];if(PIX_OK)l.push('pix_qr','pix_copia');if(CARD_OK)l.push('credito');return l}
function localKinds(){var l=['dinheiro','maquininha'];if(!PIX_OK)l.push('pix_entrega');return l}
function validKind(k){return onlineKinds().indexOf(k)>=0||localKinds().indexOf(k)>=0}

var SS={get:function(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v)}catch(e){}}};
var kind=SS.get('k10-pg-kind');
function syncKind(){
 if(!validKind(kind)){var p=typeof payment!=='undefined'?payment:'pix';kind=p==='dinheiro'?'dinheiro':p==='cartao'?'maquininha':(PIX_OK?'pix_qr':'pix_entrega')}
 try{payment=KINDS[kind].pay}catch(e){}
}
function setKind(k){if(!validKind(k))return;kind=k;SS.set('k10-pg-kind',k);syncKind()}

function findOrder(id){try{return (DB.orders||[]).find(function(o){return o.id===id})||null}catch(e){return null}}
function totalOf(o){return Number(o.total||0)+Number(o.fee||0)}
function store(){try{save()}catch(e){}}

/* ---------- estilos ---------- */
var css=document.createElement('style');
css.textContent='.pg-sub{margin:6px 0 -2px;font-size:11px;font-weight:900;color:#a9abb5;text-transform:uppercase;letter-spacing:.07em}'+
'.pg-list{display:grid;gap:8px}@media(min-width:760px){.pg-list{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}}'+
'.pg-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;border-radius:12px;border:1px solid #2b3352;background:#0f1428;color:#fff;transition:border-color .15s,background .15s}'+
'.pg-opt:hover{border-color:#3e4c78}.pg-opt.on{border-color:var(--gold,#2ec0ff);background:#0f2236;box-shadow:inset 0 0 0 1px var(--gold,#2ec0ff)}'+
'.pg-ic{font-size:22px;width:28px;text-align:center;flex:none}.pg-tx{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.pg-tx b{font-size:14px;line-height:1.2}.pg-tx small{font-size:11px;color:#a9abb5;font-weight:600;line-height:1.3}'+
'.pg-dot{width:18px;height:18px;border-radius:50%;border:2px solid #50515a;flex:none}.pg-opt.on .pg-dot{border-color:var(--gold,#2ec0ff);background:radial-gradient(circle,var(--gold,#2ec0ff) 42%,transparent 47%)}'+
'.pg-pay{display:grid;gap:12px}.pg-val{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:#0f1428;border:1px solid #282f49}.pg-val small{font-size:12px;color:#a9abb5;font-weight:700}.pg-val b{font-size:24px;color:var(--gold,#2ec0ff)}'+
'.pg-qr{background:#fff;border-radius:14px;padding:12px;width:min(100%,250px);margin:0 auto}.pg-qr svg{display:block;width:100%;height:auto}'+
'.pg-code{width:100%;min-height:86px;resize:none;background:#0a0e1e;color:#e9f2f6;border:1px solid #50515a;border-radius:10px;padding:10px 12px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all}'+
'.pg-steps{margin:0;padding-left:20px;font-size:13px;line-height:1.65;color:#d6d5dc}.pg-center{text-align:center}'+
'.pg-more{border:1px solid #282f49;border-radius:12px;padding:10px 12px}.pg-more summary{cursor:pointer;font-weight:800;font-size:13px}.pg-more[open] summary{margin-bottom:10px}'+
'.pg-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.pg-ok{color:#a7ffcd;font-weight:800}.pg-wait{color:#ffe29f;font-weight:800}'+
'.pg-pay a.button{text-decoration:none}'+
/* tema claro do site dos clientes */
'html.k10-light .pg-sub{color:#737373}'+
'html.k10-light .pg-opt{background:#fff;border-color:#e6e6e6;color:#333;border-radius:8px}html.k10-light .pg-opt:hover{border-color:#bfbfbf}'+
'html.k10-light .pg-opt.on{background:#f3f8ff;border-color:#3483fa;box-shadow:inset 0 0 0 1px #3483fa}html.k10-light .pg-tx b{color:#333}html.k10-light .pg-tx small{color:#737373}'+
'html.k10-light .pg-dot{border-color:#bfbfbf}html.k10-light .pg-opt.on .pg-dot{border-color:#3483fa;background:radial-gradient(circle,#3483fa 42%,transparent 47%)}'+
'html.k10-light .pg-val{background:#f5f5f5;border-color:#e6e6e6;border-radius:8px}html.k10-light .pg-val small{color:#737373}html.k10-light .pg-val b{color:#333}'+
'html.k10-light .pg-qr{border:1px solid #e6e6e6}html.k10-light .pg-code{background:#f5f5f5;color:#333;border-color:#bfbfbf;border-radius:6px}'+
'html.k10-light .pg-steps{color:#333}html.k10-light .pg-more{border-color:#e6e6e6;border-radius:8px}html.k10-light .pg-more summary{color:#3483fa}html.k10-light .pay-box b{color:#fff}';
document.head.appendChild(css);

/* ---------- QR Code em SVG ---------- */
function qrSVG(text){
 var q=new K10QR.QRCode(-1,K10QR.ECL.M);q.addData(text);q.make();
 var n=q.getModuleCount(),m=4,size=n+m*2,d='';
 for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))d+='M'+(c+m)+' '+(r+m)+'h1v1h-1z';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges" role="img" aria-label="QR Code do Pix"><rect width="'+size+'" height="'+size+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';
}
function pixCode(o){return K10Pix.gerar({chave:PIX.chave,tipo:PIX.tipo,nome:PIX.nome,cidade:PIX.cidade,valor:totalOf(o)/100,txid:String(o.code||'K10').replace(/[^A-Za-z0-9]/g,'')})}

/* ---------- checkout: novas formas de pagamento ---------- */
function optHTML(k){var d=KINDS[k],on=kind===k,ret=typeof mode!=='undefined'&&mode==='retirada';
 var sub=d.s;if(k==='maquininha')sub=ret?'Débito ou crédito na retirada':'Débito ou crédito na entrega';if(k==='dinheiro')sub=ret?'Pague no balcão ao retirar':'Informe se precisa de troco';
 return '<button type="button" class="pg-opt'+(on?' on':'')+'" data-pg="'+k+'" aria-pressed="'+on+'"><span class="pg-ic" aria-hidden="true">'+d.icon+'</span><span class="pg-tx"><b>'+d.t+'</b><small>'+sub+'</small></span><span class="pg-dot" aria-hidden="true"></span></button>'}
function detailHTML(){var ret=typeof mode!=='undefined'&&mode==='retirada';
 switch(kind){
  case 'dinheiro':return '<div class="grid2"><label class="field">Troco para quanto?<input name="changeFor" inputmode="decimal" placeholder="Ex.: 100,00"><small>Deixe vazio se não precisar de troco</small></label></div>';
  case 'maquininha':return notice(ret?'💳 Pague com cartão na maquininha quando retirar o pedido.':'💳 O entregador leva a maquininha. Débito ou crédito no ato da entrega.');
  case 'pix_entrega':return notice('📲 PIX na entrega: o entregador mostra o QR Code ou a chave.');
  case 'pix_qr':return notice('📷 Ao confirmar, aparece o <b>QR Code do Pix</b> com o valor exato do pedido. A K10 começa a separar assim que o Pix for confirmado.','good');
  case 'pix_copia':return notice('📋 Ao confirmar, aparece o <b>código Pix copia e cola</b>. É só copiar e colar no app do seu banco, em Pix › Pix Copia e Cola.','good');
  case 'credito':return notice('💳 Ao confirmar, você vai para a <b>página segura da InfinitePay</b> e paga com cartão de crédito em até 12x. Depois volta para o site. A K10 não vê nem guarda os dados do seu cartão.','good');
 }return ''}
function payHTML(){var on=onlineKinds(),loc=localKinds(),ret=typeof mode!=='undefined'&&mode==='retirada';
 return '<h3>Forma de pagamento</h3>'+(on.length?'<p class="pg-sub">Pague agora pelo site</p><div class="pg-list">'+on.map(optHTML).join('')+'</div>':'')+
  '<p class="pg-sub">'+(on.length?'Ou pague ':'Pague ')+(ret?'na retirada':'na entrega')+'</p><div class="pg-list">'+loc.map(optHTML).join('')+'</div>'+detailHTML()}

if(CLIENTE&&typeof checkout==='function'){
 var _checkout=checkout;
 checkout=function(){syncKind();var h=_checkout.apply(this,arguments);if(typeof h!=='string')return h;
  var a=h.indexOf('<h3>Forma de pagamento</h3>'),b=a<0?-1:h.indexOf('<label class="check"><input type="checkbox" name="age"',a);
  if(a<0||b<0)return h;
  h=h.slice(0,a)+payHTML()+h.slice(b);
  if(KINDS[kind]&&KINDS[kind].online)h=h.replace('type="submit">Confirmar pedido ·','type="submit">Confirmar e pagar ·');
  return h};
}

/* ---------- pedido criado: marca o pagamento online ---------- */
var PEND='k10-pg-pend',pend=SS.get(PEND);
if(CLIENTE&&typeof sell==='function'){
 var _sell=sell;
 sell=function(o){var order=_sell.apply(this,arguments);
  try{if(order&&o&&o.origin==='site'&&typeof view!=='undefined'&&view==='checkout'&&KINDS[kind]&&KINDS[kind].online){
   order.pagOnline={tipo:kind,status:'aguardando',criado:Date.now()};pend=order.id;SS.set(PEND,pend);store()}}catch(e){console.warn('pagamento',e)}
  return order};
}
/* abre o pagamento quando o banco confirmar o pedido (número e total oficiais) */
if(CLIENTE)setInterval(function(){if(!pend)return;var o=findOrder(pend);
 if(!o||!o.pagOnline){pend=null;SS.set(PEND,null);return}
 if(o._sb==='erro'||o.status==='cancelado'){pend=null;SS.set(PEND,null);return}
 if(o._sb==='ok'||(o._sb===undefined&&Date.now()-(o.pagOnline.criado||0)>2500)){pend=null;SS.set(PEND,null);openPay(o)}},600);

function openPay(o){if(!o||!o.pagOnline)return;if(o.pagOnline.tipo==='credito')cardPopup(o);else pixPopup(o)}

/* ---------- Pix: QR Code e copia e cola ---------- */
function pixPopup(o){var code;try{code=pixCode(o)}catch(e){toast('Não consegui gerar o Pix: '+e.message,true);return}
 var qrFirst=o.pagOnline.tipo==='pix_qr';
 var qr='<div class="pg-qr">'+qrSVG(code)+'</div><p class="tiny muted pg-center">No app do banco: Pix › Ler QR Code</p>';
 var copy='<label class="field">Pix copia e cola<textarea class="pg-code" readonly rows="4" id="pgCode">'+esc(code)+'</textarea></label><button type="button" class="button block" data-pg-copiar>📋 Copiar código Pix</button>';
 var steps=qrFirst?'<ol class="pg-steps"><li>Abra o app do seu banco e escolha <b>Pix › Ler QR Code</b>.</li><li>Aponte a câmera para o QR Code acima.</li><li>Confira o valor de <b>'+money(totalOf(o))+'</b> e confirme.</li></ol>'
  :'<ol class="pg-steps"><li>Toque em <b>Copiar código Pix</b>.</li><li>No app do seu banco, vá em <b>Pix › Pix Copia e Cola</b>.</li><li>Cole o código, confira o valor de <b>'+money(totalOf(o))+'</b> e confirme.</li></ol>';
 var body='<div class="pg-pay"><div class="pg-val"><small>Pedido '+esc(o.code)+'</small><b>'+money(totalOf(o))+'</b></div>'+
  (qrFirst?qr+steps+'<details class="pg-more"><summary>Está no celular? Use o Pix copia e cola</summary>'+copy+'</details>'
          :copy+steps+'<details class="pg-more"><summary>Prefere ler o QR Code?</summary>'+qr+'</details>')+
  '<button type="button" class="button red block" data-pg-paguei="'+esc(o.id)+'">✅ Já paguei</button>'+
  '<p class="tiny muted">Assim que o Pix cair, a K10 aprova e começa a separar seu pedido. Você acompanha tudo em <b>Meus pedidos</b>.</p></div>';
 popup('Pagar com Pix',body)}

function copyCode(){var t=document.getElementById('pgCode');if(!t)return;var v=t.value;
 function ok(){toast('Código Pix copiado! Agora cole no app do seu banco.')}
 function fb(){try{t.focus();t.select();t.setSelectionRange(0,v.length);document.execCommand('copy');ok()}catch(e){toast('Selecione o código e copie manualmente.',true)}}
 if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(v).then(ok,fb);else fb()}

/* ---------- Cartão de crédito: checkout da InfinitePay ---------- */
function cardPopup(o,msg){
 var body='<div class="pg-pay"><div class="pg-val"><small>Pedido '+esc(o.code)+'</small><b>'+money(totalOf(o))+'</b></div>'+(msg||'')+
  '<p class="tiny">Você vai para a <b>página segura da InfinitePay</b> para pagar com cartão de crédito em até 12x. Depois do pagamento, volta automaticamente para o site da K10.</p>'+
  '<button type="button" class="button red block" data-pg-cartao="'+esc(o.id)+'">💳 Pagar com cartão agora</button>'+
  '<button type="button" class="button dark block" data-pg-maq="'+esc(o.id)+'">Prefiro pagar na entrega (maquininha)</button></div>';
 popup('Pagar com cartão',body)}

function returnURL(o){return location.origin+location.pathname+'?pg=retorno&pedido='+encodeURIComponent(o.id)}
function startCard(o,btn){
 if(!CARD_OK){cardPopup(o,notice('O pagamento com cartão pelo site ainda não está ligado. Pague na entrega com a maquininha.','red'));return}
 if(btn){btn.disabled=true;btn.textContent='Abrindo o pagamento…'}
 if(o.pagOnline&&o.pagOnline.link&&o.pagOnline.linkTotal===totalOf(o)){location.href=o.pagOnline.link;return}
 var body={handle:TAG,order_nsu:String(o.code||o.id),redirect_url:returnURL(o),items:[{description:'Pedido '+(o.code||'')+' · K10 Delivery',price:Math.round(totalOf(o)),quantity:1}]};
 fetch(API+'/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  .then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}return {ok:r.ok,status:r.status,j:j}})})
  .then(function(x){var url=x.j&&(x.j.url||x.j.link||x.j.checkout_url);
   if(!x.ok||!url||!/^https:\/\//.test(url))throw Error((x.j&&(x.j.message||x.j.error))||('Erro '+x.status));
   o.pagOnline=Object.assign(o.pagOnline||{tipo:'credito'},{link:url,linkTotal:totalOf(o),nsu:body.order_nsu});store();location.href=url})
  .catch(function(e){console.warn('InfinitePay',e&&e.message);
   cardPopup(o,notice('Não conseguimos abrir o pagamento com cartão agora. Tente de novo em instantes ou pague na entrega com a maquininha.','red'))})}

/* volta da InfinitePay */
function handleReturn(){var q;try{q=new URLSearchParams(location.search)}catch(e){return}if(q.get('pg')!=='retorno')return;
 var id=q.get('pedido'),o=findOrder(id);
 var info={order_nsu:q.get('order_nsu')||'',slug:q.get('slug')||'',transaction_nsu:q.get('transaction_nsu')||'',capture_method:q.get('capture_method')||'',receipt_url:q.get('receipt_url')||''};
 try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}
 if(o){o.pagOnline=Object.assign(o.pagOnline||{tipo:'credito'},{retorno:info,status:'conferindo'});store()}
 try{go('tracking')}catch(e){}
 var rec=/^https:\/\//.test(info.receipt_url)?'<a class="button dark block" href="'+esc(info.receipt_url)+'" target="_blank" rel="noopener">🧾 Ver comprovante</a>':'';
 var code=o?esc(o.code):esc(info.order_nsu);
 popup('Pagamento','<div class="pg-pay"><p>Conferindo o pagamento do pedido <b>'+code+'</b>…</p></div>');
 function done(paid,j){if(o){o.pagOnline.status=paid?'pago':'conferindo';if(paid){o.pagOnline.pago=Date.now();o.pagOnline.parcelas=j&&j.installments;o.pagOnline.metodo=j&&j.capture_method}store()}
  try{render()}catch(e){}
  if(paid)popup('✅ Pagamento aprovado','<div class="pg-pay"><p>Recebemos o pagamento do pedido <b>'+code+'</b>'+(j&&j.paid_amount?' · '+money(j.paid_amount):'')+'. Agora é com a K10: acompanhe em <b>Meus pedidos</b>.</p>'+rec+'<button type="button" class="button block" data-action="close">Ok</button></div>');
  else popup('Pagamento em conferência','<div class="pg-pay"><p>Recebemos o seu retorno da InfinitePay. A K10 confere o pagamento do pedido <b>'+code+'</b> e aprova em seguida.</p>'+rec+(o?'<button type="button" class="button dark block" data-pg-cartao="'+esc(o.id)+'">Não paguei · tentar de novo</button>':'')+'<button type="button" class="button block" data-action="close">Ok</button></div>')}
 if(!TAG||!info.order_nsu){done(false);return}
 fetch(API+'/payment_check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:TAG,order_nsu:info.order_nsu,transaction_nsu:info.transaction_nsu,slug:info.slug})})
  .then(function(r){return r.json()}).then(function(j){done(!!(j&&j.paid),j)}).catch(function(){done(false)})}

/* ---------- forma de pagamento nos pedidos ---------- */
if(typeof payInfo==='function'){
 var _payInfo=payInfo;
 payInfo=function(o){var p=o&&o.pagOnline;if(!p||!KINDS[p.tipo]||!KINDS[p.tipo].online)return _payInfo.apply(this,arguments);
  var tot=money(totalOf(o)),pix=p.tipo!=='credito',jeito=p.tipo==='pix_qr'?'QR Code':p.tipo==='pix_copia'?'copia e cola':'InfinitePay';
  if(!CLIENTE){
   if(p.status==='na_entrega')return '💳 <b>Cartão na maquininha</b> · '+tot+' · cliente desistiu do pagamento pelo site: cobrar na entrega';
   return pix?'📲 <b>Pix pelo site</b> ('+jeito+') · '+tot+' · confira no app da InfinitePay se o Pix do pedido '+esc(o.code)+' caiu antes de aprovar. Confirmado: não cobrar na entrega.'
             :'💳 <b>Cartão de crédito pelo site</b> (InfinitePay) · '+tot+' · confira no app da InfinitePay se o pedido '+esc(o.code)+' foi pago antes de aprovar. Se não foi pago, cobrar na maquininha.'}
  var aberto=FINAL.indexOf(o.status)<0;
  if(pix){var st=p.status==='informado'?'<span class="pg-wait">você avisou que pagou · a K10 está conferindo</span>':'<span class="pg-wait">aguardando o Pix</span>';
   return '📲 <b>Pix pelo site</b> · '+tot+' · '+st+(aberto?'<div class="pg-acts"><button type="button" class="button small" data-pg-abrir="'+esc(o.id)+'">'+(p.status==='informado'?'Ver o Pix de novo':'Pagar com Pix agora')+'</button></div>':'')}
  if(p.status==='na_entrega')return '💳 <b>Cartão na maquininha</b> · '+tot+' · pague na entrega';
  if(p.status==='pago')return '💳 <b>Cartão pelo site</b> · '+tot+' · <span class="pg-ok">✅ pagamento aprovado</span>';
  return '💳 <b>Cartão pelo site</b> · '+tot+' · <span class="pg-wait">'+(p.status==='conferindo'?'pagamento em conferência':'aguardando pagamento')+'</span>'+(aberto?'<div class="pg-acts"><button type="button" class="button small" data-pg-abrir="'+esc(o.id)+'">Pagar com cartão agora</button></div>':'')};
}

/* ---------- cliques ---------- */
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;var b;
 try{
  if(b=t.closest('[data-pg],[data-pg-copiar],[data-pg-paguei],[data-pg-abrir],[data-pg-cartao],[data-pg-maq]'))e.stopPropagation();
  if(b=t.closest('[data-pg]')){e.preventDefault();setKind(b.getAttribute('data-pg'));render();return}
  if(b=t.closest('[data-pg-copiar]')){e.preventDefault();copyCode();return}
  if(b=t.closest('[data-pg-paguei]')){e.preventDefault();var o=findOrder(b.getAttribute('data-pg-paguei'));if(o&&o.pagOnline){o.pagOnline.status='informado';o.pagOnline.informado=Date.now();store()}closeModal();render();toast('Obrigado! A K10 vai conferir o Pix e aprovar seu pedido.');return}
  if(b=t.closest('[data-pg-abrir]')){e.preventDefault();openPay(findOrder(b.getAttribute('data-pg-abrir')));return}
  if(b=t.closest('[data-pg-cartao]')){e.preventDefault();var oc=findOrder(b.getAttribute('data-pg-cartao'));if(oc)startCard(oc,b);return}
  if(b=t.closest('[data-pg-maq]')){e.preventDefault();var om=findOrder(b.getAttribute('data-pg-maq'));if(om&&om.pagOnline){om.pagOnline.status='na_entrega';store()}closeModal();render();toast('Combinado! O entregador leva a maquininha.');return}
 }catch(err){toast(err.message||'Erro no pagamento',true)}
},true);

if(CLIENTE){syncKind();handleReturn();try{if(typeof view!=='undefined'&&view==='checkout')render()}catch(e){}}
window.K10_PAGAMENTO={versao:1,pix:PIX_OK,cartao:CARD_OK};
})();
