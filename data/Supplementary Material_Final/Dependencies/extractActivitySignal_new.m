%% Created by SK (16/04/2020)

function [selActSig] = extractActivitySignal_new (sTimes, sDates, eTimes, eDates,...
    actDates, actTime, actSig)

% Date = datetime(sDates,'InputFormat','dd/MM/yyyy');
% Time = datetime(datestr(sTimes,'HH:MM:SS'),'InputFormat','HH:mm:ss');
% CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');

selActSig=[];

for days = 1:numel(sTimes)
    
    sTInd=strfind(actDates,sDates(days));
    sTInd=find(~cellfun(@isempty,sTInd));
    TimeArray = actTime(sTInd);
    nInd = strfind(TimeArray,sTimes(days));
    nInd=find(~cellfun(@isempty,nInd));
    stInd = nInd + sTInd(1);

    eTInd=strfind(actDates,eDates(days));
    eTInd=find(~cellfun(@isempty,eTInd));
    TimeArray = actTime(eTInd);
    nInd = strfind(TimeArray,eTimes(days));
    nInd=find(~cellfun(@isempty,nInd));
    enInd = nInd + eTInd(1);

    temp=actSig(stInd:enInd);

    if ~isnan(mean(temp))
       selActSig=[selActSig {temp}];
    end
end
