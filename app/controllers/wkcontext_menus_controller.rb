require 'net/http'
require 'json'

class WkcontextMenusController < ApplicationController

  
  def wkcrmcontact
    url = URI.parse('http://www.example.com/index.html')
    req = Net::HTTP::Get.new(url.to_s)
    res = Net::HTTP.start(url.host, url.port) {|http|
    http.request(req)
    }

    @menu = []
    allNumbersUndefined = []
    positions = params[:data]
    positions.each do |value|
      option = (eval(value))
      if option[:numbers].all? {|key, number| number == nil} || option[:numbers].all? {|key, number| number.length < 1}
        option[:allNumbersUndefined] = true
        allNumbersUndefined.push(true)
      else
        option[:allNumbersUndefined] = false
        allNumbersUndefined.push(false)
      end
      @menu.push(option)
    end
    @jsonMenu = @menu.to_json
    render :layout => false 
  end

  def wkcrmqueue
    @selectedNumbers = params.permit(numbers: [])
    @contactsWithoutNumbers = params.permit(name: [])
    urlJson = Setting.json_configuration_url
    path = File.join(Rails.root, urlJson)
    @queueUrl = Setting.add_to_queue_url
    @availableQueues = JSON.parse(File.read(path))
    render :layout => false
  end
end
