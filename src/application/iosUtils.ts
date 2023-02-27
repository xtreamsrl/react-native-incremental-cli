import {getAppName, getRootDestinationFolder} from './utils'

export const iosBuildPlatforms = {
  "simulator": {
    "name": "iphonesimulator",
    "ext": "app",
    "buildCmd": "build"
  },
  "iphone": {
    "name": "iphoneos",
    "ext": "ipa",
    "buildCmd": "archive"
  }
};



export function getIosBuildDestination(platform: { ext: string; buildCmd: string; name: string }, buildType: string) {
  const destinationDir = `${getRootDestinationFolder()}/ios/${platform.name}/${buildType}`
  const destination = `${destinationDir}/${getAppName()}.${platform.ext}`
  return {destinationDir, destination}
}