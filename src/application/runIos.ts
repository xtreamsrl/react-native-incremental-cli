import childProcess from 'child_process'
import fs from 'fs'
import prompts from 'prompts'
import chalk from 'chalk'
import {executeCommand, getProjectRootDir} from './utils'
import {buildIos} from './buildIos'
import {getIosBuildDestination, iosBuildPlatforms} from './iosUtils'

// todo default app name improve passing from command line

type Device = {
  state: 'Booted' | 'shutdown';
  name: string;
  udid: string;
  type: 'simulator'; // todo
}

function getDevices(): Device[] {
  const devicesJson = JSON.parse(
    childProcess.execSync('xcrun simctl list -j devices', {encoding: 'utf-8'}),
  )
  return Object.values(devicesJson.devices).flat() as Device[]
}

function getBootedDevicesIds(allDevices: Device[]) {
  const bootedDevices = allDevices.filter(d => d.state === 'Booted')
  return bootedDevices
}

function checkBuildPresent(
  engineDir: string,
  buildType: string,
  target: any,
) {
  const {destination} = getIosBuildDestination(
    target,
    buildType,
  )
  return fs.existsSync(destination)
}

function installApp(
  deviceUdid: string,
  engineDir: string,
  buildType: string,
  target: any,
) {
  const {destination} = getIosBuildDestination(
    target,
    buildType,
  )

  childProcess.execSync(`xcrun simctl install ${deviceUdid} ${destination}`)
}

function launchApp(deviceUid: string, bundleId: string) {
  childProcess.execSync(`xcrun simctl launch ${deviceUid} ${bundleId}`)
}

function launchDevice(deviceUid: string) {
  executeCommand(['xcrun', 'simctl', 'boot', deviceUid].join(' '))

}

async function promptForDeviceSelection(allDevices: Device[]): Promise<Device[]> {
  const {
    devices,
  } = await prompts({
    type: 'multiselect',
    name: 'devices',
    message: 'Select the device / emulator you want to use',
    choices: allDevices.map(d => ({
      title: `${chalk.bold(`(${d.type})`)} ${chalk.green(`${d.name}`)} (${d.state === 'Booted' ? 'connected' : 'disconnected'})`,
      value: d,
    })),
    min: 1,
  })
  return devices
}

export async function runApp(buildType: string, appId: string) {

  // todo run on phisical devices
  if (!checkBuildPresent(getProjectRootDir(), buildType, iosBuildPlatforms.simulator)) {
    buildIos(buildType as any, 'simulator')
  }

  // todo improve run on device
  executeCommand('open -a Simulator')

  const devices = getDevices()

  if (devices.length === 0) {
    throw new Error('No iOS devices available')
  }

  let bootedDevices = getBootedDevicesIds(devices)

  const devicesToRun: Device[] = []

  if (bootedDevices.length === 1) {
    devicesToRun.push(bootedDevices[0])
  } else {
    const requestedDevices = await promptForDeviceSelection(devices)

    console.log(requestedDevices)
    for (const requestedDevice of requestedDevices) {
      if (!(requestedDevice.state === 'Booted')) {
        console.log(requestedDevice)

        launchDevice(requestedDevice.udid)
      }
    }
    // start not connected ones
    devicesToRun.push(...requestedDevices)

  }

  for (const device of devicesToRun) {
    const id = device.udid
    installApp(id, getProjectRootDir(), buildType, iosBuildPlatforms.simulator)
    launchApp(id, appId)
  }

}
