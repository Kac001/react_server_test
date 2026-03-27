source 'https://rubygems.org'

gem 'cocoapods', '>= 1.13', '!= 1.15.0', '!= 1.15.1'
gem 'activesupport', '>= 6.1.7.5', '< 7.1.0'
gem 'xcodeproj', '< 1.26.0'
gem 'concurrent-ruby', '< 1.3.4'

gem 'bigdecimal'
gem 'logger'

plugins_path = File.join(File.dirname(__FILE__), '.bundle', 'plugins')
eval_gemfile(File.join(plugins_path, 'ruby', '3.1.0', 'gems', 'bundler-2.6.9', 'libexec', 'Gemfile')) if File.exist?(plugins_path)
