
(function($) {

    var app = {

        init: function() {
            var _this = this;
            // 初始化对象
            var NebPay = require("nebpay");
            this.nebPay = new NebPay();

            var account = localStorage.getItem('account');
            if (account) {
                // 用户地址
                this.account = account;
            } else {
//                this.account = 'n1dQjaU8HeFMwh79PXpu58DHNp5zhQYgbv7';
                 var str = prompt("请输入账户地址.");
                 if (str) {
                     this.account = str;
                     localStorage.setItem('account', str);
                 } else {
                     location.reload();
                 }
            }
            this.dappAddr= "n1oL4gD83Bg6rGSi1CiaXndhy7Uk7RQHdb5";
            // 初始化变量
            var nebulas = require("nebulas");
            var Account = nebulas.Account;
            this.neb = new nebulas.Neb();
            this.api = this.neb.api;
            // 设置使用的网络
            this.neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));


            this.query("getQ", null, function(data) {
                _this.render(JSON.parse(data));
            });
        },
        render: function(data) {
            var _this = this;

            var page = 0;
            if (data && data.length > 0)
                page = 1;

            var arr = [];

            var v = new Vue({
                el: '#app',
                data: {
                    list: data,
                    page: page,
                    selectNum: -1,
                    answer: null,
                    score: null
                },
                created: function() {
                    _this.query('query', null, function(score) {
                        v.score = score;
                    });
                },
                methods: {
                    enter: function(e) {
                        if (v.page == 0) {
                            _this.sendTransaction("sign", null, function(data) {
                                if (data.status == 1) {
                                    _this.query("getQ", null, function(data) {
                                        v.list = JSON.parse(data);
                                        v.page = 1;
                                    });
                                    alert('报名成功，开始答题！');
                                } else {
                                    alert('报名失败，请重新申请！');
                                }
                            }, 1);
                        } else {
                            if (!v.answer) {
                                alert('请选择答案!');
                                return;
                            }
                            arr.push({
                                num: v.selectNum,
                                answer: en(new b().encode(v.answer))
                            });
                            if (v.page == 10) {
                                if (v.score == 'null') {
                                    _this.sendTransaction("submitAnswer", "["+JSON.stringify(arr)+"]", function(data) {
                                        v.score = data.execute_result;
                                    });
                                } else {
                                    v.page = 1;
                                }
                                return;
                            }
                            v.selectNum = -1;
                            v.answer = null;
                            v.page ++;
                        }

                    },
                    select: function(num, option) {
                        v.selectNum = num;
                        v.answer = option;
                    },
                    prefix: function(idx) {
                        switch (idx) {
                            case 0: return "A、";
                            case 1: return "B、";
                            case 2: return "C、";
                            case 3: return "D、";
                        }
                    },
                    buttonText: function(page, score) {
                        if (page == 0) {
                            return '1NAS参与答题';
                        } else if (page == 10) {
                            if (score != 'null') {
                                return "返回";
                            } else {
                                return '提交答案';
                            }
                        } else {
                            return '下一题';
                        }
                    }
                }
            });
        },
        sendTransaction: function(callFunction, callArgs, callback, value) {
            var _this = this;
            value = value || 0;
            this.nebPay.call(
                this.dappAddr,
                value,
                callFunction,
                callArgs,
                {
                    qrcode: {
                        showQRCode: false
                    },
                    goods: {
                        name: 'answer',
                        desc: "answer for neb"
                    },
                    listener: function(data) {
                        console.log(data.txhash)
                        var timer = setInterval(function() {
                            _this.api.getTransactionReceipt({
                                hash: data.txhash
                            })
                                .then(function(receipt) {
                                    if (receipt.status != 2) {
                                        clearInterval(timer);
                                        callback && callback(receipt);
                                    } else {
                                        console.log('交易中...');
                                    }
                                })
                        }, 1000);
                    }
                });
        },
        // 同一调用函数（仅读取链上数据，不收取手续费，且实时返回）
        query: function(callFunction, callArgs, callback, value) {
            value = value || 0;  // 金额
            var nonce = "1";   // 交易序号
            var gas_price = "1000000"; // 手续费价格
            var gas_limit = "2000000"; // 手续费限制
            var contract = { // 合约
                "function": callFunction,   // 方法名
                "args": JSON.stringify(callArgs)            // 参数
            };

            this.neb.api.call(this.account, this.dappAddr, value, nonce, gas_price, gas_limit, contract).then(function (resp) {
                return callback(resp.result)
            }).catch(function (err) {
                console.log(err)
            });
         }
    };

    app.init();
})(jQuery || window.jQuery);
