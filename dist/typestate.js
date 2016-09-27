/*! typestate - v1.0.2 - 2016-09-27
* https://github.com/eonarheim/TypeState
* Copyright (c) 2016 Erik Onarheim; Licensed BSD-2-Clause*/
"use strict";
/**
 * Transition grouping to faciliate fluent api
 */
var Transitions = (function () {
    function Transitions(fsm) {
        this.fsm = fsm;
    }
    /**
     * Specify the end state(s) of a transition function
     */
    Transitions.prototype.to = function () {
        var states = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            states[_i - 0] = arguments[_i];
        }
        this.toStates = states;
        this.fsm.addTransitions(this);
    };
    /**
     * Specify that any state in the state enum is value
     * Takes the state enum as an argument
     */
    Transitions.prototype.toAny = function (states) {
        var toStates = [];
        for (var s in states) {
            if (states.hasOwnProperty(s)) {
                toStates.push(states[s]);
            }
        }
        this.toStates = toStates;
        this.fsm.addTransitions(this);
    };
    return Transitions;
}());
exports.Transitions = Transitions;
/**
 * Internal representation of a transition function
 */
var TransitionFunction = (function () {
    function TransitionFunction(fsm, from, to) {
        this.fsm = fsm;
        this.from = from;
        this.to = to;
    }
    return TransitionFunction;
}());
exports.TransitionFunction = TransitionFunction;
/**
 * Creates a hierarchical state machine, which allows the nesting of states in a super state, usefule
 * for modeling more complicated behaviors than with just FSMs
 * Please refer to https://en.wikipedia.org/wiki/UML_state_machine
 */
var HierarchicalStateMachine = (function () {
    function HierarchicalStateMachine() {
    }
    return HierarchicalStateMachine;
}());
exports.HierarchicalStateMachine = HierarchicalStateMachine;
/**
 * A simple finite state machine implemented in TypeScript, the templated argument is meant to be used
 * with an enumeration.
 */
var FiniteStateMachine = (function () {
    function FiniteStateMachine(startState) {
        this._transitionFunctions = [];
        this._onCallbacks = {};
        this._exitCallbacks = {};
        this._enterCallbacks = {};
        this._invalidTransitionCallback = null;
        this.currentState = startState;
        this._startState = startState;
    }
    FiniteStateMachine.prototype.addTransitions = function (fcn) {
        var _this = this;
        fcn.fromStates.forEach(function (from) {
            fcn.toStates.forEach(function (to) {
                // self transitions are invalid and don't add duplicates
                if (from !== to && !_this._validTransition(from, to)) {
                    _this._transitionFunctions.push(new TransitionFunction(_this, from, to));
                }
            });
        });
    };
    /**
     * Listen for the transition to this state and fire the associated callback
     */
    FiniteStateMachine.prototype.on = function (state, callback) {
        var key = state.toString();
        if (!this._onCallbacks[key]) {
            this._onCallbacks[key] = [];
        }
        this._onCallbacks[key].push(callback);
        return this;
    };
    /**
     * Listen for the transition to this state and fire the associated callback, returning
     * false in the callback will block the transition to this state.
     */
    FiniteStateMachine.prototype.onEnter = function (state, callback) {
        var key = state.toString();
        if (!this._enterCallbacks[key]) {
            this._enterCallbacks[key] = [];
        }
        this._enterCallbacks[key].push(callback);
        return this;
    };
    /**
     * Listen for the transition to this state and fire the associated callback, returning
     * false in the callback will block the transition from this state.
     */
    FiniteStateMachine.prototype.onExit = function (state, callback) {
        var key = state.toString();
        if (!this._exitCallbacks[key]) {
            this._exitCallbacks[key] = [];
        }
        this._exitCallbacks[key].push(callback);
        return this;
    };
    /**
     * List for an invalid transition and handle the error, returning a falsy value will throw an
     * exception, a truthy one will swallow the exception
     */
    FiniteStateMachine.prototype.onInvalidTransition = function (callback) {
        if (!this._invalidTransitionCallback) {
            this._invalidTransitionCallback = callback;
        }
        return this;
    };
    /**
     * Declares the start state(s) of a transition function, must be followed with a '.to(...endStates)'
     */
    FiniteStateMachine.prototype.from = function () {
        var states = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            states[_i - 0] = arguments[_i];
        }
        var _transition = new Transitions(this);
        _transition.fromStates = states;
        return _transition;
    };
    FiniteStateMachine.prototype.fromAny = function (states) {
        var fromStates = [];
        for (var s in states) {
            if (states.hasOwnProperty(s)) {
                fromStates.push(states[s]);
            }
        }
        var _transition = new Transitions(this);
        _transition.fromStates = fromStates;
        return _transition;
    };
    FiniteStateMachine.prototype._validTransition = function (from, to) {
        return this._transitionFunctions.some(function (tf) {
            return (tf.from === from && tf.to === to);
        });
    };
    /**
     * Check whether a transition to a new state is valid
     */
    FiniteStateMachine.prototype.canGo = function (state) {
        return this.currentState === state || this._validTransition(this.currentState, state);
    };
    /**
     * Transition to another valid state
     */
    FiniteStateMachine.prototype.go = function (state) {
        if (!this.canGo(state)) {
            if (!this._invalidTransitionCallback || !this._invalidTransitionCallback(this.currentState, state)) {
                throw new Error('Error no transition function exists from state ' + this.currentState.toString() + ' to ' + state.toString());
            }
        }
        else {
            this._transitionTo(state);
        }
    };
    /**
     * This method is availble for overridding for the sake of extensibility.
     * It is called in the event of a successful transition.
     */
    FiniteStateMachine.prototype.onTransition = function (from, to) {
        // pass, does nothing until overidden
    };
    /**
    * Reset the finite state machine back to the start state, DO NOT USE THIS AS A SHORTCUT for a transition.
    * This is for starting the fsm from the beginning.
    */
    FiniteStateMachine.prototype.reset = function () {
        this.currentState = this._startState;
    };
    /**
     * Whether or not the current state equals the given state
     */
    FiniteStateMachine.prototype.is = function (state) {
        return this.currentState === state;
    };
    FiniteStateMachine.prototype._transitionTo = function (state) {
        var _this = this;
        if (!this._exitCallbacks[this.currentState.toString()]) {
            this._exitCallbacks[this.currentState.toString()] = [];
        }
        if (!this._enterCallbacks[state.toString()]) {
            this._enterCallbacks[state.toString()] = [];
        }
        if (!this._onCallbacks[state.toString()]) {
            this._onCallbacks[state.toString()] = [];
        }
        var canExit = this._exitCallbacks[this.currentState.toString()].reduce(function (accum, next) {
            return accum && next.call(_this, state);
        }, true);
        var canEnter = this._enterCallbacks[state.toString()].reduce(function (accum, next) {
            return accum && next.call(_this, _this.currentState);
        }, true);
        if (canExit && canEnter) {
            var old = this.currentState;
            this.currentState = state;
            this._onCallbacks[this.currentState.toString()].forEach(function (fcn) {
                fcn.call(_this, old);
            });
            this.onTransition(old, state);
        }
    };
    return FiniteStateMachine;
}());
exports.FiniteStateMachine = FiniteStateMachine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXN0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3R5cGVzdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0E7O0dBRUc7QUFDSDtJQUNJLHFCQUFtQixHQUEwQjtRQUExQixRQUFHLEdBQUgsR0FBRyxDQUF1QjtJQUFJLENBQUM7SUFNbEQ7O09BRUc7SUFDSSx3QkFBRSxHQUFUO1FBQVUsZ0JBQWM7YUFBZCxXQUFjLENBQWQsc0JBQWMsQ0FBZCxJQUFjO1lBQWQsK0JBQWM7O1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFDRDs7O09BR0c7SUFDSSwyQkFBSyxHQUFaLFVBQWEsTUFBVztRQUNwQixJQUFJLFFBQVEsR0FBUSxFQUFFLENBQUM7UUFDdkIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNuQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0IsUUFBUSxDQUFDLElBQUksQ0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFDTCxrQkFBQztBQUFELENBQUMsQUE3QkQsSUE2QkM7QUE3QlksbUJBQVcsY0E2QnZCLENBQUE7QUFFRDs7R0FFRztBQUNIO0lBQ0ksNEJBQW1CLEdBQTBCLEVBQVMsSUFBTyxFQUFTLEVBQUs7UUFBeEQsUUFBRyxHQUFILEdBQUcsQ0FBdUI7UUFBUyxTQUFJLEdBQUosSUFBSSxDQUFHO1FBQVMsT0FBRSxH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QWMsRUFBRSxJQUFtQjtZQUN0RyxNQUFNLENBQUMsS0FBSyxJQUFjLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSSxFQUFFLEtBQUksQ0FBQyxZQUFZLENBQUUsQ0FBQztRQUNsRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFVCxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO1lBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUc7Z0JBQ3ZELEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNMLENBQUM7SUFDTCx5QkFBQztBQUFELENBQUMsQUFoTEQsSUFnTEM7QUFoTFksMEJBQWtCLHFCQWdMOUIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBUcmFuc2l0aW9uIGdyb3VwaW5nIHRvIGZhY2lsaWF0ZSBmbHVlbnQgYXBpXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2l0aW9uczxUPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGZzbTogRmluaXRlU3RhdGVNYWNoaW5lPFQ+KSB7IH1cblxuICAgIHB1YmxpYyBmcm9tU3RhdGVzOiBUW107XG4gICAgcHVibGljIHRvU3RhdGVzOiBUW107XG5cblxuICAgIC8qKlxuICAgICAqIFNwZWNpZnkgdGhlIGVuZCBzdGF0ZShzKSBvZiBhIHRyYW5zaXRpb24gZnVuY3Rpb25cbiAgICAgKi9cbiAgICBwdWJsaWMgdG8oLi4uc3RhdGVzOiBUW10pIHtcbiAgICAgICAgdGhpcy50b1N0YXRlcyA9IHN0YXRlcztcbiAgICAgICAgdGhpcy5mc20uYWRkVHJhbnNpdGlvbnModGhpcyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNwZWNpZnkgdGhhdCBhbnkgc3RhdGUgaW4gdGhlIHN0YXRlIGVudW0gaXMgdmFsdWVcbiAgICAgKiBUYWtlcyB0aGUgc3RhdGUgZW51bSBhcyBhbiBhcmd1bWVudFxuICAgICAqL1xuICAgIHB1YmxpYyB0b0FueShzdGF0ZXM6IGFueSkge1xuICAgICAgICB2YXIgdG9TdGF0ZXM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBzIGluIHN0YXRlcykge1xuICAgICAgICAgICAgaWYgKHN0YXRlcy5oYXNPd25Qcm9wZXJ0eShzKSkge1xuICAgICAgICAgICAgICAgIHRvU3RhdGVzLnB1c2goKDxUPnN0YXRlc1tzXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50b1N0YXRlcyA9IHRvU3RhdGVzO1xuICAgICAgICB0aGlzLmZzbS5hZGRUcmFuc2l0aW9ucyh0aGlzKTtcbiAgICB9XG59XG5cbi8qKlxuICogSW50ZXJuYWwgcmVwcmVzZW50YXRpb24gb2YgYSB0cmFuc2l0aW9uIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2l0aW9uRnVuY3Rpb248VD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBmc206IEZpbml0ZVN0YXRlTWFjaGluZTxUPiwgcHVibGljIGZyb206IFQsIHB1YmxpYyB0bzogVCkgeyB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGhpZXJhcmNoaWNhbCBzdGF0ZSBtYWNoaW5lLCB3aGljaCBhbGxvd3MgdGhlIG5lc3Rpbmcgb2Ygc3RhdGVzIGluIGEgc3VwZXIgc3RhdGUsIHVzZWZ1bGVcbiAqIGZvciBtb2RlbGluZyBtb3JlIGNvbXBsaWNhdGVkIGJlaGF2aW9ycyB0aGFuIHdpdGgganVzdCBGU01zXG4gKiBQbGVhc2UgcmVmZXIgdG8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVU1MX3N0YXRlX21hY2hpbmVcbiAqL1xuZXhwb3J0IGNsYXNzIEhpZXJhcmNoaWNhbFN0YXRlTWFjaGluZSB7XG5cblxufVxuXG4vKipcbiAqIEEgc2ltcGxlIGZpbml0ZSBzdGF0ZSBtYWNoaW5lIGltcGxlbWVudGVkIGluIFR5cGVTY3JpcHQsIHRoZSB0ZW1wbGF0ZWQgYXJndW1lbnQgaXMgbWVhbnQgdG8gYmUgdXNlZFxuICogd2l0aCBhbiBlbnVtZXJhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbml0ZVN0YXRlTWFjaGluZTxUPiB7XG4gICAgcHVibGljIGN1cnJlbnRTdGF0ZTogVDtcbiAgICBwcml2YXRlIF9zdGFydFN0YXRlOiBUO1xuICAgIHByaXZhdGUgX3RyYW5zaXRpb25GdW5jdGlvbnM6IFRyYW5zaXRpb25GdW5jdGlvbjxUPltdID0gW107XG4gICAgcHJpdmF0ZSBfb25DYWxsYmFja3M6IHsgW2tleTogc3RyaW5nXTogeyAoZnJvbTogVCk6IHZvaWQ7IH1bXSB9ID0ge307XG4gICAgcHJpdmF0ZSBfZXhpdENhbGxiYWNrczogeyBba2V5OiBzdHJpbmddOiB7ICh0bzogVCk6IGJvb2xlYW47IH1bXSB9ID0ge307XG4gICAgcHJpdmF0ZSBfZW50ZXJDYWxsYmFja3M6IHsgW2tleTogc3RyaW5nXTogeyAoZnJvbTogVCk6IGJvb2xlYW47IH1bXSB9ID0ge307XG4gICAgcHJpdmF0ZSBfaW52YWxpZFRyYW5zaXRpb25DYWxsYmFjazogKHRvPzogVCwgZnJvbT86IFQpID0+IGJvb2xlYW4gPSBudWxsO1xuXG4gICAgY29uc3RydWN0b3Ioc3RhcnRTdGF0ZTogVCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHN0YXJ0U3RhdGU7XG4gICAgICAgIHRoaXMuX3N0YXJ0U3RhdGUgPSBzdGFydFN0YXRlO1xuICAgIH1cblxuICAgIHB1YmxpYyBhZGRUcmFuc2l0aW9ucyhmY246IFRyYW5zaXRpb25zPFQ+KSB7XG4gICAgICAgIGZjbi5mcm9tU3RhdGVzLmZvckVhY2goZnJvbSA9PiB7XG4gICAgICAgICAgICBmY24udG9TdGF0ZXMuZm9yRWFjaCh0byA9PiB7XG4gICAgICAgICAgICAgICAgLy8gc2VsZiB0cmFuc2l0aW9ucyBhcmUgaW52YWxpZCBhbmQgZG9uJ3QgYWRkIGR1cGxpY2F0ZXNcbiAgICAgICAgICAgICAgICBpZiAoZnJvbSAhPT0gdG8gJiYgIXRoaXMuX3ZhbGlkVHJhbnNpdGlvbihmcm9tLCB0bykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fdHJhbnNpdGlvbkZ1bmN0aW9ucy5wdXNoKG5ldyBUcmFuc2l0aW9uRnVuY3Rpb248VD4odGhpcywgZnJvbSwgdG8pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGlzdGVuIGZvciB0aGUgdHJhbnNpdGlvbiB0byB0aGlzIHN0YXRlIGFuZCBmaXJlIHRoZSBhc3NvY2lhdGVkIGNhbGxiYWNrXG4gICAgICovXG4gICAgcHVibGljIG9uKHN0YXRlOiBULCBjYWxsYmFjazogKGZyb20/OiBUKSA9PiBhbnkpOiBGaW5pdGVTdGF0ZU1hY2hpbmU8VD4ge1xuICAgICAgICB2YXIga2V5ID0gc3RhdGUudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKCF0aGlzLl9vbkNhbGxiYWNrc1trZXldKSB7XG4gICAgICAgICAgICB0aGlzLl9vbkNhbGxiYWNrc1trZXldID0gW107XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fb25DYWxsYmFja3Nba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGlzdGVuIGZvciB0aGUgdHJhbnNpdGlvbiB0byB0aGlzIHN0YXRlIGFuZCBmaXJlIHRoZSBhc3NvY2lhdGVkIGNhbGxiYWNrLCByZXR1cm5pbmdcbiAgICAgKiBmYWxzZSBpbiB0aGUgY2FsbGJhY2sgd2lsbCBibG9jayB0aGUgdHJhbnNpdGlvbiB0byB0aGlzIHN0YXRlLlxuICAgICAqL1xuICAgIHB1YmxpYyBvbkVudGVyKHN0YXRlOiBULCBjYWxsYmFjazogKGZyb20/OiBUKSA9PiBib29sZWFuKTogRmluaXRlU3RhdGVNYWNoaW5lPFQ+IHtcbiAgICAgICAgdmFyIGtleSA9IHN0YXRlLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmICghdGhpcy5fZW50ZXJDYWxsYmFja3Nba2V5XSkge1xuICAgICAgICAgICAgdGhpcy5fZW50ZXJDYWxsYmFja3Nba2V5XSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2VudGVyQ2FsbGJhY2tzW2tleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExpc3RlbiBmb3IgdGhlIHRyYW5zaXRpb24gdG8gdGhpcyBzdGF0ZSBhbmQgZmlyZSB0aGUgYXNzb2NpYXRlZCBjYWxsYmFjaywgcmV0dXJuaW5nXG4gICAgICogZmFsc2UgaW4gdGhlIGNhbGxiYWNrIHdpbGwgYmxvY2sgdGhlIHRyYW5zaXRpb24gZnJvbSB0aGlzIHN0YXRlLlxuICAgICAqL1xuICAgIHB1YmxpYyBvbkV4aXQoc3RhdGU6IFQsIGNhbGxiYWNrOiAodG8/OiBUKSA9PiBib29sZWFuKTogRmluaXRlU3RhdGVNYWNoaW5lPFQ+IHtcbiAgICAgICAgdmFyIGtleSA9IHN0YXRlLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmICghdGhpcy5fZXhpdENhbGxiYWNrc1trZXldKSB7XG4gICAgICAgICAgICB0aGlzLl9leGl0Q2FsbGJhY2tzW2tleV0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9leGl0Q2FsbGJhY2tzW2tleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIExpc3QgZm9yIGFuIGludmFsaWQgdHJhbnNpdGlvbiBhbmQgaGFuZGxlIHRoZSBlcnJvciwgcmV0dXJuaW5nIGEgZmFsc3kgdmFsdWUgd2lsbCB0aHJvdyBhblxuICAgICAqIGV4Y2VwdGlvbiwgYSB0cnV0aHkgb25lIHdpbGwgc3dhbGxvdyB0aGUgZXhjZXB0aW9uXG4gICAgICovXG4gICAgcHVibGljIG9uSW52YWxpZFRyYW5zaXRpb24oY2FsbGJhY2s6IChmcm9tPzogVCwgdG8/OiBUKSA9PiBib29sZWFuKTogRmluaXRlU3RhdGVNYWNoaW5lPFQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLl9pbnZhbGlkVHJhbnNpdGlvbkNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLl9pbnZhbGlkVHJhbnNpdGlvbkNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVjbGFyZXMgdGhlIHN0YXJ0IHN0YXRlKHMpIG9mIGEgdHJhbnNpdGlvbiBmdW5jdGlvbiwgbXVzdCBiZSBmb2xsb3dlZCB3aXRoIGEgJy50byguLi5lbmRTdGF0ZXMpJ1xuICAgICAqL1xuICAgIHB1YmxpYyBmcm9tKC4uLnN0YXRlczogVFtdKTogVHJhbnNpdGlvbnM8VD4ge1xuICAgICAgICB2YXIgX3RyYW5zaXRpb24gPSBuZXcgVHJhbnNpdGlvbnM8VD4odGhpcyk7XG4gICAgICAgIF90cmFuc2l0aW9uLmZyb21TdGF0ZXMgPSBzdGF0ZXM7XG4gICAgICAgIHJldHVybiBfdHJhbnNpdGlvbjtcbiAgICB9XG5cbiAgICBwdWJsaWMgZnJvbUFueShzdGF0ZXM6IGFueSk6IFRyYW5zaXRpb25zPFQ+IHtcbiAgICAgICAgdmFyIGZyb21TdGF0ZXM6IFRbXSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBzIGluIHN0YXRlcykge1xuICAgICAgICAgICAgaWYgKHN0YXRlcy5oYXNPd25Qcm9wZXJ0eShzKSkge1xuICAgICAgICAgICAgICAgIGZyb21TdGF0ZXMucHVzaCgoPFQ+c3RhdGVzW3NdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgX3RyYW5zaXRpb24gPSBuZXcgVHJhbnNpdGlvbnM8VD4odGhpcyk7XG4gICAgICAgIF90cmFuc2l0aW9uLmZyb21TdGF0ZXMgPSBmcm9tU3RhdGVzO1xuICAgICAgICByZXR1cm4gX3RyYW5zaXRpb247XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBfdmFsaWRUcmFuc2l0aW9uKGZyb206IFQsIHRvOiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl90cmFuc2l0aW9uRnVuY3Rpb25zLnNvbWUodGYgPT4ge1xuICAgICAgICAgICAgcmV0dXJuICh0Zi5mcm9tID09PSBmcm9tICYmIHRmLnRvID09PSB0byk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIHdoZXRoZXIgYSB0cmFuc2l0aW9uIHRvIGEgbmV3IHN0YXRlIGlzIHZhbGlkXG4gICAgICovXG4gICAgcHVibGljIGNhbkdvKHN0YXRlOiBUKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRTdGF0ZSA9PT0gc3RhdGUgfHwgdGhpcy5fdmFsaWRUcmFuc2l0aW9uKHRoaXMuY3VycmVudFN0YXRlLCBzdGF0ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJhbnNpdGlvbiB0byBhbm90aGVyIHZhbGlkIHN0YXRlXG4gICAgICovXG4gICAgcHVibGljIGdvKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5jYW5HbyhzdGF0ZSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5faW52YWxpZFRyYW5zaXRpb25DYWxsYmFjayB8fCAhdGhpcy5faW52YWxpZFRyYW5zaXRpb25DYWxsYmFjayh0aGlzLmN1cnJlbnRTdGF0ZSwgc3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciBubyB0cmFuc2l0aW9uIGZ1bmN0aW9uIGV4aXN0cyBmcm9tIHN0YXRlICcgKyB0aGlzLmN1cnJlbnRTdGF0ZS50b1N0cmluZygpICsgJyB0byAnICsgc3RhdGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl90cmFuc2l0aW9uVG8oc3RhdGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhpcyBtZXRob2QgaXMgYXZhaWxibGUgZm9yIG92ZXJyaWRkaW5nIGZvciB0aGUgc2FrZSBvZiBleHRlbnNpYmlsaXR5LlxuICAgICAqIEl0IGlzIGNhbGxlZCBpbiB0aGUgZXZlbnQgb2YgYSBzdWNjZXNzZnVsIHRyYW5zaXRpb24uXG4gICAgICovXG4gICAgcHVibGljIG9uVHJhbnNpdGlvbihmcm9tOiBULCB0bzogVCkge1xuICAgICAgICAvLyBwYXNzLCBkb2VzIG5vdGhpbmcgdW50aWwgb3ZlcmlkZGVuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgKiBSZXNldCB0aGUgZmluaXRlIHN0YXRlIG1hY2hpbmUgYmFjayB0byB0aGUgc3RhcnQgc3RhdGUsIERPIE5PVCBVU0UgVEhJUyBBUyBBIFNIT1JUQ1VUIGZvciBhIHRyYW5zaXRpb24uXG4gICAgKiBUaGlzIGlzIGZvciBzdGFydGluZyB0aGUgZnNtIGZyb20gdGhlIGJlZ2lubmluZy5cbiAgICAqL1xuICAgIHB1YmxpYyByZXNldCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLl9zdGFydFN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgb3Igbm90IHRoZSBjdXJyZW50IHN0YXRlIGVxdWFscyB0aGUgZ2l2ZW4gc3RhdGVcbiAgICAgKi9cbiAgICBwdWJsaWMgaXMoc3RhdGU6IFQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFN0YXRlID09PSBzdGF0ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIF90cmFuc2l0aW9uVG8oc3RhdGU6IFQpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9leGl0Q2FsbGJhY2tzW3RoaXMuY3VycmVudFN0YXRlLnRvU3RyaW5nKCldKSB7XG4gICAgICAgICAgICB0aGlzLl9leGl0Q2FsbGJhY2tzW3RoaXMuY3VycmVudFN0YXRlLnRvU3RyaW5nKCldID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuX2VudGVyQ2FsbGJhY2tzW3N0YXRlLnRvU3RyaW5nKCldKSB7XG4gICAgICAgICAgICB0aGlzLl9lbnRlckNhbGxiYWNrc1tzdGF0ZS50b1N0cmluZygpXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLl9vbkNhbGxiYWNrc1tzdGF0ZS50b1N0cmluZygpXSkge1xuICAgICAgICAgICAgdGhpcy5fb25DYWxsYmFja3Nbc3RhdGUudG9TdHJpbmcoKV0gPSBbXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgdmFyIGNhbkV4aXQgPSB0aGlzLl9leGl0Q2FsbGJhY2tzW3RoaXMuY3VycmVudFN0YXRlLnRvU3RyaW5nKCldLnJlZHVjZTxib29sZWFuPigoYWNjdW06IGJvb2xlYW4sIG5leHQ6ICgpID0+IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhY2N1bSAmJiAoPGJvb2xlYW4+bmV4dC5jYWxsKHRoaXMsIHN0YXRlKSk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHZhciBjYW5FbnRlciA9IHRoaXMuX2VudGVyQ2FsbGJhY2tzW3N0YXRlLnRvU3RyaW5nKCldLnJlZHVjZTxib29sZWFuPigoYWNjdW06IGJvb2xlYW4sIG5leHQ6ICgpID0+IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgIHJldHVybiBhY2N1bSAmJiAoPGJvb2xlYW4+bmV4dC5jYWxsKHRoaXMsIHRoaXMuY3VycmVudFN0YXRlKSk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIGlmIChjYW5FeGl0ICYmIGNhbkVudGVyKSB7XG4gICAgICAgICAgICB2YXIgb2xkID0gdGhpcy5jdXJyZW50U3RhdGU7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHN0YXRlO1xuICAgICAgICAgICAgdGhpcy5fb25DYWxsYmFja3NbdGhpcy5jdXJyZW50U3RhdGUudG9TdHJpbmcoKV0uZm9yRWFjaChmY24gPT4ge1xuICAgICAgICAgICAgICAgIGZjbi5jYWxsKHRoaXMsIG9sZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMub25UcmFuc2l0aW9uKG9sZCwgc3RhdGUpO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19