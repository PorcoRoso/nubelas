    'use strict';

    var AnswerContract = function () {
        LocalContractStorage.defineMapProperty(this, "questionRandom");//所需答题人和对应题集合
        LocalContractStorage.defineMapProperty(this, "integral");//积分集合
        LocalContractStorage.defineMapProperty(this, "startTimes");//开始答题时间
        LocalContractStorage.defineMapProperty(this, "timeCost");//答题用时

        LocalContractStorage.defineProperty(this, "questionBank");//题库
        LocalContractStorage.defineProperty(this, "author");
        LocalContractStorage.defineProperty(this, "addrs");//已提交的账户地址
    };

    function toNas (value) {
        return new BigNumber(value).mul(1e-18);
    }

    function toWei (value) {
        return new BigNumber(value).mul(1e+18);
    }

    Array.prototype.contains = function (obj) {
        var i = this.length;
        while (i--) {
            if (this[i] === obj) {
                return true;
            }
        }
        return false;
    };

    AnswerContract.prototype = {
        init: function () {
            //TODO:
            var from = Blockchain.transaction.from;
            this.author=from;
            this.questionBank = [];
            this.addrs = [];
        },
        //1.题库录入
        saveItemBank: function (questionStr) {
            var from = Blockchain.transaction.from;
            if(from != this.author){
                throw new Error("Unable to enter the question bank");
            }
            try{
                this.questionBank = questionStr;
            } catch(e) {
                throw new Error("json parse error.");
            }
        },
        //2.报名,收钱 同时产生随机题库
        sign: function () {
            var from = Blockchain.transaction.from;
            var value = new BigNumber(Blockchain.transaction.value);
            var user = this.questionRandom.get(from);
            if (user) {
                throw new Error("Already participated in the current event.");
            } else {
                if (toNas(value).greaterThanOrEqualTo(1)) {
                    //产生随机题库
                    var lengths=this.questionBank.length;
                    var arr=[];
                    var numArr = [];
                    for (; arr.length<10; ) {
                        var num;
                        do {
                            num = Math.floor(Math.random()*lengths);
                        } while(numArr.contains(num));

                        var q = this.questionBank[num];
                        var obj = {
                            num: num,
                            question: q.Question,
                            option: q.Option.split('%')
                        };
                        arr.push(obj);
                        numArr.push(num);
                    }
                    this.questionRandom.put(from,arr);
                    this.startTimes.put(from, Date.now());
                    return arr;
                } else {
                    throw new Error("Amount is less than the amount of the competition.");
                }
            }
        },
        //3.获取题库
        getQ: function () {
            var from = Blockchain.transaction.from;
            return this.questionRandom.get(from);
        },
        //4.提交答题,统计积分,到达条件,开始结算
        submitAnswer: function (alist) {
            var from = Blockchain.transaction.from;
            var sce = this.integral.get(from);
            // 查询分数，没有分数则说明还未提交过答案
            if (!sce && sce != 0) {
                // 计算用时
                var time = this.startTimes.get(from);
                var timeCost = Date.now() - time;
                // 题库集合
                var allList = this.questionBank;
                // 随机出的10个题
                var rdList = this.questionRandom.get(from);
                var score = 0;
                rdList.forEach(function(q1) {
                    alist.forEach(function(q2) {
                        if (q1.num == q2.num && q2.answer.toLowerCase() == allList[q1.num].Answer.toLowerCase()) {
                            score += 10;
                        }
                    });
                });

                this.integral.put(from, score);
                this.timeCost.put(from, timeCost);
                this.addrs.push(from);

                if (this.addrs.length >= 5) {
                    // 将相关数据存放至临时数组
                    var arr = [];
                    for (var i = 0; i < this.addrs.length; i ++) {
                        var json = {
                            score: this.integral.get(from),
                            cost: this.timeCost.get(from),
                            addr: this.addrs[i]
                        };
                    }

                    // 数组排序
                    arr.sort(function(obj1, obj2) {
                        if (obj1.score > obj1.score) {
                            return -1;
                        } else if (obj1.score == obj2.score) {
                            if (obj1.cost >= obj2.cost) {
                                return -1;
                            } else {
                                return 1;
                            }
                        } else {
                            return 1;
                        }
                    });

                    // 前5名按比例发放
                    var proportion = [0.5, 0.2, 0.1, 0.05, 0.03];
                    var total = new BigNumber(5);
                    for (var i = 0; i < proportion.length; i ++) {
                        Blockchain.transfer(arr[i].addr, toWei(total.mul(proportion[i])));
                    }

                    // 计算结束，重置操作
                    for (var i = 0; i < arr[i].length; i++) {
                        var addr = arr[i].addr;
                        this.questionRandom.del(addr);
                        this.integral.del(addr);
                        this.startTimes.del(addr);
                        this.timeCost.del(addr);
                    }
                    this.addrs = [];

                }

                return score;
            } else {
                throw new Error("At present, the application has been completed and the answer can not be repeated.");
            }

        },
        //5.查询积分
        query: function () {
            var from = Blockchain.transaction.from;
            return this.integral.get(from);
        },
        // 防止代币锁死
        antiLock: function() {
            var from = Blockchain.transaction.from;
            var value = new BigNumber(Blockchain.transaction.value);
            if(from == this.author){
                var result = Blockchain.transfer(from, value);
                return result;
            }
        }

    };
    module.exports = AnswerContract;
