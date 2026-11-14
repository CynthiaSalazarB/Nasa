function [] = plotNightData (actData, sTimes, sDates, eTimes, eDates)

stTimeArray = [];
for night = 1:numel(sTimes)
    tempDate = sDates{night};
    tempTime = sTimes{night};
    Date = datetime(tempDate,'InputFormat','dd/MM/yyyy');
    Time = datetime(datestr(tempTime,'HH:MM:SS'),'InputFormat','HH:mm:ss');
    CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');
    stTime = CnvtDT(Date,Time);          % Check Output
    stTimeArray = [stTimeArray; stTime];
end

enTimeArray = [];
for night = 1:numel(sTimes)
    tempDate = eDates{night};
    tempTime = eTimes{night};
    Date = datetime(tempDate,'InputFormat','dd/MM/yyyy');
    Time = datetime(datestr(tempTime,'HH:MM:SS'),'InputFormat','HH:mm:ss');
    CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');
    stTime = CnvtDT(Date,Time);          % Check Output
    enTimeArray = [enTimeArray; stTime];
end

figure;

for night = 1:numel(actData)
    tempData = actData{night};
    subplot (numel(actData), 1, night)
    plot (tempData); hold on;
    labels = cell(1,numel(tempData));
    labels(1) = cellstr(stTimeArray(night));
    labels(end) = cellstr(enTimeArray(night));
%     xx = cell(1,numel(tempData));
%     xx(1) = {1};
%     xx(end) = {numel(tempData)};
%     xx = cell2mat(xx);
    set(gca,'XTick',[1:1:numel(tempData)]);
    set(gca,'XTickLabel',labels);
    ylabel ('Count')
    box off
    set(gca,'TickDir','out')
    titleStr = strcat ('Night: ', num2str(night));
    title(titleStr);
end
sgtitle('Chronic Patient')

figure;

for night = 1:numel(actData)
    tempData = actData{night};
    subplot (numel(actData)*2-1, 1, 1+(night-1)*2)
    plot (tempData); hold on;
    labels = cell(1,numel(tempData));
    labels(1) = cellstr(stTimeArray(night));
    labels(end) = cellstr(enTimeArray(night));
%     xx = cell(1,numel(tempData));
%     xx(1) = {1};
%     xx(end) = {numel(tempData)};
%     xx = cell2mat(xx);
    set(gca,'XTick',[]);
    set(gca,'XTickLabel',[]);
    set(gca,'FontSize',16)
    ylabel ('Count')
    box off
    set(gca,'TickDir','out')
    titleStr = strcat ('Night: ', num2str(night));
    title(titleStr);
end
% sgtitle('Chronic Patient')

edges = [10:10:500];
figure;
for night = 1:numel(actData)
    tempData = actData{night};
    subplot (3, 3, night)
%     figure, histogram (tempData, edges);
    histogram (tempData, edges);
    ylabel ('count')
    set(gca,'XTick',[0:100:500]);
    ylim ([0 12])
%     set(gca,'YTick',[0:100:500]);
    set(gca,'FontSize',22)
    titleStr = strcat ('Night: ', num2str(night));
    title(titleStr);
end
% stop here;

edges = [10:10:500];

for night = 1:numel(actData)
    tempData = actData{night};
%     subplot (3, 3, night)
%     figure, histogram (tempData, edges);
    figure, 
    histogram (tempData, edges);
    ylabel ('count')
    set(gca,'XTick',[0:100:500]);
    ylim ([0 10])
%     set(gca,'YTick',[0:100:500]);
    set(gca,'FontSize',22)
%     titleStr = strcat ('Night: ', num2str(night));
%     title(titleStr);
end


