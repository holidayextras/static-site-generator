const React = require('react')

function Layout (props) {
  return React.createElement('div', { className: 'layout' }, props.children)
}

module.exports = Layout
