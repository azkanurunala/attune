Pod::Spec.new do |s|
  s.name           = 'ExpoGameCenter'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo native module wrapping Apple Game Center (GameKit).'
  s.description    = 'Authenticate, submit scores, present and load leaderboards via GameKit. No login UI.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'GameKit', 'UIKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
