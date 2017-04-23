"use strict"

var React = require('react')
var ReactDOM = require('react-dom')
var div = React.createElement.bind(null, 'div')
var button = React.createElement.bind(null, 'button')
var input = React.createElement.bind(null, 'input')
var a = React.createElement.bind(null, 'a')
var select = React.createElement.bind(null, 'select')
var option = React.createElement.bind(null, 'option')
var label = React.createElement.bind(null, 'label')

var idInc = 0

var keyHandlers = {
	38: 'handleUpKey',
	40: 'handleDownKey',
	32: 'handleSpaceKey',
	13: 'handleEnterKey',
	27: 'handleEscKey',
	74: 'handleDownKey',
	75: 'handleUpKey'
}

function interceptEvent(event) {
	if (event) {
		event.preventDefault()
		event.stopPropagation()
	}
}

module.exports = React.createClass({
	displayName: 'exports',
	getInitialState: function () {
		return {
			id: 'react-select-box-' + (++idInc),
			open: false,
			focusedIndex: -1,
			pendingValue: [],
			searchVisible: false,
			searchEnabled: typeof this.props.filterFn === 'function',
			searchText: ""
		}
	},

	getDefaultProps: function () {
		return {
			closeText: 'Close',
			clearText: 'Remove selection'
		}
	},

	changeOnClose: function () {
		return this.isMultiple() && String(this.props.changeOnClose) === 'true'
	},

	updatePendingValue: function (value, cb) {
		if (this.changeOnClose()) {
			this.setState({pendingValue: value}, cb)
			return true
		}
		return false
	},

	componentWillMount: function () {
		this.updatePendingValue(this.props.value)
	},

	componentWillReceiveProps: function (next) {
		this.updatePendingValue(next.value)
	},

	clickingOption: false,

	blurTimeout: null,

	handleFocus: function () {
		clearTimeout(this.blurTimeout)
	},

	handleSearchBlur: function () {
		this.setState({searchVisible: false});
		var menuNode = ReactDOM.findDOMNode(this.refs.menu);
		if (document.hasFocus(menuNode)) {
			return this.handleClose();
		}
	},
	handleSearchFocus: function () {
		clearTimeout(this.blurTimeout)
		this.handleOpen();
	},

	handleBlur: function () {
		clearTimeout(this.blurTimeout)
		this.blurTimeout = setTimeout(this.handleClose, 0)
	},

	handleMouseDown: function () {
		this.clickingOption = true
	},

	handleChange: function (val, cb) {
		return function (event) {
			this.clickingOption = false
			interceptEvent(event)
			if (this.isMultiple()) {
				var selected = []
				if (val != null) {
					selected = this.value().slice(0)
					var index = selected.indexOf(val)
					if (index !== -1) {
						selected.splice(index, 1)
					} else {
						selected.push(val)
					}
				}
				this.updatePendingValue(selected, cb) || this.props.onChange(selected);
				if (this.state.searchEnabled) {
					this.setState({open: true})
				}

			} else {
				this.updatePendingValue(val, cb) || this.props.onChange(val)
				this.handleClose()
				if (!this.state.searchEnabled) {
					this.refs.button.focus()
				}
			}
		}.bind(this)
	},

	handleNativeChange: function (event) {
		var val = event.target.value
		if (this.isMultiple()) {
			var children = [].slice.call(event.target.childNodes, 0)
			val = children.reduce(function (memo, child) {
				if (child.selected) {
					memo.push(child.value)
				}
				return memo
			}, [])
		}
		this.props.onChange(val)
	},

	handleClear: function (event) {
		interceptEvent(event)
		this.handleChange(null, function () {
			// only called when change="true"
			this.props.onChange(this.state.pendingValue)
		})(event)
	},

	toggleOpenClose: function (event) {
		interceptEvent(event)
		this.setState({open: !this.state.open});
		if (this.state.open) {
			return this.setState({open: false, searchVisible: false})
		}

		this.handleOpen()
	},

	handleOpen: function (event) {
		interceptEvent(event)
		this.setState({open: true, searchVisible: this.state.searchEnabled}, function () {
			if (this.state.searchEnabled) {
				this.refs.searchInput.focus();
			} else {
				this.refs.menu.focus()
			}
		})
	},

	handleClose: function (event) {
		interceptEvent(event)
		if (!this.clickingOption) {
			this.setState({open: false, searchVisible: false, focusedIndex: -1})
		}
		if (this.changeOnClose()) {
			this.props.onChange(this.state.pendingValue)
		}
	},


	moveFocus: function (move) {
		var len = React.Children.count(this.props.children)
		var idx = (this.state.focusedIndex + move + len) % len
		this.setState({focusedIndex: idx})
	},

	handleKeyDown: function (event) {
		if (this.state.searchEnabled && [27, 38, 40, 13].indexOf(event.which) === -1) {
			return;
		}
		if (keyHandlers[event.which]) {
			this[keyHandlers[event.which]](event)
		}
	},

	handleUpKey: function (event) {
		interceptEvent(event)
		this.moveFocus(-1)
	},

	handleDownKey: function (event) {
		interceptEvent(event)
		if (!this.state.open) {
			this.handleOpen(event)
		}
		this.moveFocus(1)
	},

	handleSpaceKey: function (event) {
		if (this.state.searchEnabled) {
			return;
		}
		interceptEvent(event)
		if (!this.state.open) {
			this.handleOpen(event)
		} else if (this.state.focusedIndex !== -1) {
			this.handleEnterKey()
		}
	},

	handleEnterKey: function (event) {
		if (this.state.focusedIndex !== -1) {
			this.handleChange(this.options()[this.state.focusedIndex].value)(event)
		}
	},

	handleEscKey: function (event) {
		if (this.state.open) {
			this.handleClose(event)
		} else {
			this.handleClear(event)
		}
	},

	label: function () {
		var selected = this.options()
			.filter(function (option) {
				return this.isSelected(option.value)
			}.bind(this))
			.map(function (option) {
				return option.label
			})
		return selected.length > 0 ? selected.join(', ') : this.props.label
	},

	isMultiple: function () {
		return String(this.props.multiple) === 'true'
	},

	isSearchable: function () {
		return this.state.searchEnabled;
	},

	options: function () {
		var options = []
		React.Children.forEach(this.props.children, function (option) {
			options.push({
				value: option.props.value,
				label: option.props.children
			})
		});

		if (this.state.searchEnabled && this.state.searchText.length > 0) {
			var self = this;
			return options.filter(function (item) {
				return self.props.filterFn(self.state.searchText, item);
			});
		}
		else {
			return options;
		}
	},

	value: function () {
		var value = this.changeOnClose() ?
			this.state.pendingValue :
			this.props.value

		if (!this.isMultiple() || Array.isArray(value)) {
			return value
		}
		if (value != null) {
			return [value]
		}
		return []
	},

	hasValue: function () {
		if (this.isMultiple()) {
			return this.value().length > 0
		}
		return this.value() != null
	},

	isSelected: function (value) {
		if (this.isMultiple()) {
			return this.value().indexOf(value) !== -1
		}
		return this.value() === value
	},

	render: function () {
		var className = 'react-select-box-container'
		if (this.props.className) {
			className += ' ' + this.props.className
		}
		if (this.isMultiple()) {
			className += ' react-select-box-multi'
		}
		if (!this.hasValue()) {
			className += ' react-select-box-empty'
		}
		return (
			div(
				{
					onKeyDown: this.handleKeyDown,
					className: className
				},
				this.isSearchable() ? this.renderSearchButton() : this.renderDefaultButton(),
				this.renderOptionMenu(),
				this.renderClearButton(),
				this.renderNativeSelect()
			)
		)
	},

	renderNativeSelect: function () {
		var id = this.state.id + '-native-select'
		var multiple = this.isMultiple()
		var empty = multiple ? null : option({key: '', value: ''}, 'No Selection')
		var options = [empty].concat(this.props.children)
		return div(
			{className: 'react-select-box-native'},
			label({htmlFor: id}, this.props.label),
			select({
				id: id,
				multiple: multiple,
				onKeyDown: function (e) {
					e.stopPropagation()
				},
				value: this.props.value || (multiple ? [] : ''),
				onChange: this.handleNativeChange
			}, options)
		)

	},

	renderDefaultButton: function () {
		var self = this;
		return button(
			{
				id: self.state.id,
				ref: 'button',
				className: 'react-select-box',
				onClick: self.toggleOpenClose,
				onBlur: self.handleBlur,
				tabIndex: '0',
				'aria-hidden': true
			},
			div({className: 'react-select-box-label'}, self.label())
		)
	},

	renderSearchButton: function () {
		var self = this;
		if (this.state.searchVisible) {
			return this.renderSearchInput();
		}
		return button(
			{
				id: self.state.id,
				ref: 'button',
				className: 'react-select-box',
				onClick: self.handleOpen,
				onBlur: self.handleBlur,
				tabIndex: '0',
				'aria-hidden': true
			},
			div({className: 'react-select-box-label'}, self.label())
		)
	},

	renderSearchInput: function () {
		var self = this;
		return input(
			{
				id: self.state.id + '-search',
				ref: "searchInput",
				value: self.state.searchText,
				className: 'react-select-box',
				onFocus: this.handleFocus(),
				onChange: function (e) {
					self.setState({
						searchText: e.currentTarget.value
					});
				},
				onBlur: this.handleSearchBlur,
				tabIndex: '0',
				'type': "text",
				'aria-hidden': true,
			}
		)
	},

	renderOptionMenu: function () {
		var className = 'react-select-box-options'
		var selectOptions = this.options();
		if (!this.state.open) {
			className += ' react-select-box-hidden'
		}
		/*
		 var active = null
		 if (this.state.focusedIndex !== -1) {
		 active = this.state.id + '-' + this.state.focusedIndex
		 }
		 */
		return div(
			{
				className: className,
				onBlur: this.handleBlur,
				onFocus: this.handleFocus,
				'aria-hidden': true,
				ref: 'menu',
				tabIndex: 0
			},
			div(
				{
					className: 'react-select-box-off-screen' + (selectOptions.length === 0 ? ' no-items' : '')
				},
				selectOptions.length > 0 ? selectOptions.map(this.renderOption) :
					this.props.noItemsText
			),
			this.renderCloseButton()
		)
	},

	renderOption: function (option, i) {
		var className = 'react-select-box-option'
		if (i === this.state.focusedIndex) {
			className += ' react-select-box-option-focused'
		}
		if (this.isSelected(option.value)) {
			className += ' react-select-box-option-selected'
		}
		return a(
			{
				id: this.state.id + '-' + i,
				href: '#',
				onClick: this.handleChange(option.value),
				onMouseDown: this.handleMouseDown,
				className: className,
				tabIndex: -1,
				key: option.value,
				onBlur: this.handleBlur,
				onFocus: this.handleFocus
			},
			option.label
		)
	},

	renderClearButton: function () {
		if (this.hasValue()) {
			return button({
				'aria-label': this.props.clearText,
				className: 'react-select-box-clear',
				onClick: this.handleClear
			})
		}
	},

	renderCloseButton: function () {
		if (this.isMultiple() && this.props.closeText) {
			return button(
				{
					onClick: this.handleClose,
					className: 'react-select-box-close',
					onBlur: this.handleBlur,
					onFocus: this.handleFocus
				},
				this.props.closeText
			)
		}
	}
})