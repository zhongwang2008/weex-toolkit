const chalk = require('chalk')
const boxen = require('boxen')

const detect = require('detect-port')
const headless = require('./server/headless')
const config = require('./config')
const debugServer = require('./server')
const mlink = require('./link')
const { launcher } = require('./util')
const Router = mlink.Router

const { logger, util } = require('./util')

function resolveConnectUrl (config) {
  const host = config.ip + ':' + config.port
  util.setConnectUrl(
    config.connectUrl ||
      `http://${host}/devtool_fake.html?_wx_devtool=ws://${host}/debugProxy/native/{channelId}`
  )
}

exports.startServerAndLaunch = function (ip, port, manual, cb) {
  this.startServer(ip, port).then(() => {
    cb && cb()
    if (!manual) this.launch(ip, port)
  })
}

exports.startServer = function (ip, port) {
  return new Promise((resolve, reject) => {
    const inUse = config.inUse
    let message = chalk.green('Start debugger server!')
    if (inUse) {
      message +=
        ' ' +
        chalk.red(
          '(on port ' +
            inUse.open +
            ',' +
            (' because ' + inUse.old + ' is already in use)')
        )
    }
    message += '\n\n'
    message +=
      '- ' +
      chalk.bold('Websocket Address For Native: ') +
      ' ws://' +
      ip +
      ':' +
      port +
      '/debugProxy/native\n'
    message +=
      '- ' +
      chalk.bold('Debug Server:                 ') +
      ' http://' +
      ip +
      ':' +
      port +
      '\n'
    debugServer.start(port, function () {
      logger.log(
        boxen(message, {
          padding: 1,
          borderColor: 'green',
          margin: 1
        })
      )
      resolve()
    })
  })
}

exports.launch = function (ip, port) {
  const debuggerURL = 'http://' + (ip || 'localhost') + ':' + port + '/'
  logger.info('Launching Dev Tools...')
  if (config.ENABLE_HEADLESS) {
    // Check whether the port is occupied
    detect(config.REMOTE_DEBUG_PORT).then(function (open) {
      if (+config.REMOTE_DEBUG_PORT !== open) {
        headless.closeHeadless()
        logger.info(
          `Starting inspector on port ${open}, because ${
            config.REMOTE_DEBUG_PORT
          } is already in use`
        )
      }
      else {
        logger.info(`Starting inspector on port ${open}`)
      }
      config.REMOTE_DEBUG_PORT = open
      headless.launchHeadless(`${config.ip}:${config.port}`, open)
    })
  }
  launcher.launchChrome(debuggerURL, config.REMOTE_DEBUG_PORT || 9222)
}

exports.reload = function () {
  Router.get('debugger').pushMessage('proxy.native', {
    method: 'WxDebug.reload'
  })
}

exports.start = function (bundles, config, cb) {
  config.bundles = bundles
  resolveConnectUrl(config)
  this.startServerAndLaunch(config.ip, config.port, config.manual, cb)
}
