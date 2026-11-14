%% Created by SK
%% Input based on number of nights
%% reading actigraphy data

clear all;
close all;
clc;

% ####
InpNights = 7;              % Specify the number of nights for model development
% ####

addpath '.\Dependencies\';
chrInsPath='.\Data\CLIENT\';
actFiles=dir(strcat(chrInsPath,'*.csv'));
allActFNamesChrIns={};
allActSigChrIns={};
allActDateChrIns={};
allActTimeChrIns={};
allActGenderChrIns = {};
allActAgeChrIns = {};

[spStTmChrIns, spEnTmChrIns, spStDateChrIns, spEnDateChrIns] = deal({});

for i=1:length(actFiles)
    fName=char(actFiles(i).name);
    allActFNamesChrIns=[allActFNamesChrIns;fName(2:5)];
    [actData,actInfo]=xlsread(strcat(chrInsPath,fName));
    fprintf ('Reading actigraphy file %d chronic Insomina subject: %s \n',i, fName);
    temp=actData(:,1);
    temp=temp(end:-1:1);
    ind=find(temp==1);
    ind=ind(1);
    ind=length(temp)-ind+1;
    actTime=actData(ind:end,3);
    actTime=cellstr(datestr(actTime,'HH:MM:SS PM'));
    actSig=actData(ind:end,5);
    temp=actInfo(:,2);
    ind=find(contains(temp,'Date')==1);
    ind=ind(end);
    actDates=temp(ind+2:end);
    allActSigChrIns=[allActSigChrIns;{actSig}];
    allActDateChrIns=[allActDateChrIns;{actDates}];
    allActTimeChrIns=[allActTimeChrIns;{actTime}];
    
    temp=actInfo(:,1);
    ind=find(contains(temp,'Gender')==1);
    actGender = actInfo(ind,2);
    allActGenderChrIns = [allActGenderChrIns; actGender];
    
    temp=actInfo(:,1);
    ind=find(contains(temp,'Birth')==1);
    actDOB = actInfo{ind,2};
    ind=find(contains(temp,'Start Date')==1);
    actst = actInfo{ind,2};
    age = abs(datenum(actst, 'dd/mm/yy') - datenum(actDOB, 'dd/mm/yy'))./(7*52);
    allActAgeChrIns = [allActAgeChrIns; age];
    
    ind=find(contains(temp,'SLEEP')==1);
    numNigths = numel(ind);
    startDates = actInfo(ind,3);
    endDates = actInfo(ind,5);
    ind = ind - (length(actInfo)-length(actData));
    
    startTime = actData (ind,4);
    startTime = cellstr(datestr(startTime,'HH:MM:SS PM'));
    spStTmChrIns = [spStTmChrIns; {startTime}];
    spStDateChrIns = [spStDateChrIns; {startDates}];
    
    endTime = actData (ind,6);
    endTime = cellstr(datestr(endTime,'HH:MM:SS PM'));
    spEnTmChrIns = [spEnTmChrIns; {endTime}];
    spEnDateChrIns = [spEnDateChrIns; {endDates}];
end

%% reading data of healthy (partner) group
healthyPath='.\Data\PARTNER\';
actFiles=dir(strcat(healthyPath,'*.csv'));
allActFNamesHealthy={};
allActSigHealthy={};
allActDateHealthy={};
allActTimeHealthy={};
allActGenderHealthy = {};
allActAgeHealthy = {};
[spStTmHealthy, spEnTmHealthy, spStDateHealthy, spEnDateHealthy] = deal({});

for i=1:numel(actFiles)
    fName=char(actFiles(i).name);
    allActFNamesHealthy=[allActFNamesHealthy;fName(2:5)];
    [actData,actInfo]=xlsread(strcat(healthyPath,fName));
    fprintf ('Reading actigraphy file %d healthy subject: %s \n',i, fName);
    temp=actData(:,1);
    temp=temp(end:-1:1);
    ind=find(temp==1);
    ind=ind(1);
    ind=length(temp)-ind+1;
    actTime=actData(ind:end,3);
    actTime=cellstr(datestr(actTime,'HH:MM:SS PM'));
    actSig=actData(ind:end,5);
    temp=actInfo(:,2);
    ind=find(contains(temp,'Date')==1);
    ind=ind(end);
    actDates=temp(ind+2:end);
    allActSigHealthy=[allActSigHealthy;{actSig}];
    allActDateHealthy=[allActDateHealthy;{actDates}];
    allActTimeHealthy=[allActTimeHealthy;{actTime}];
    
    temp=actInfo(:,1);
    ind=find(contains(temp,'Gender')==1);
    actGender = actInfo(ind,2);
    allActGenderHealthy = [allActGenderHealthy; actGender];
    
    temp=actInfo(:,1);
    ind=find(contains(temp,'Birth')==1);
    actDOB = actInfo{ind,2};
    ind=find(contains(temp,'Start Date')==1);
    actst = actInfo{ind,2};
    age = abs(datenum(actst, 'dd/mm/yy') - datenum(actDOB, 'dd/mm/yy'))./(7*52);
    allActAgeHealthy = [allActAgeHealthy; age];
    
    ind=find(contains(temp,'SLEEP')==1);
    numNigths = numel(ind);
    startDates = actInfo(ind,3);
    endDates = actInfo(ind,5);
    ind = ind - (length(actInfo)-length(actData));
    
    startTime = actData (ind,4);
    startTime = cellstr(datestr(startTime,'HH:MM:SS PM'));
    spStTmHealthy = [spStTmHealthy; {startTime}];
    spStDateHealthy = [spStDateHealthy; {startDates}];
    
    endTime = actData (ind,6);
    endTime = cellstr(datestr(endTime,'HH:MM:SS PM'));
    spEnTmHealthy = [spEnTmHealthy; {endTime}];
    spEnDateHealthy = [spEnDateHealthy; {endDates}];
    
end

%% selecting night time actigraphy data

formatOut='dd-mmm-yyyy HH:MM:SS';
allActSigNightChrIns=[];
allSubjNightIndsChrIns=[];
subjectNightsChrIns = [];
subjectsDurChrIns = [];
[stTimeChrIns, enTimeChrIns, fnameChrIns, actSigChrIns] = deal({});
count = 0;

for i=1:length(allActSigChrIns)
    actSig=allActSigChrIns{i};
    actTime=allActTimeChrIns{i};
    actDates=allActDateChrIns{i};
        
    sTimes = spStTmChrIns{i};
    sDates = spStDateChrIns{i};
    eTimes = spEnTmChrIns{i};
    eDates = spEnDateChrIns{i};
    
    if numel(sTimes)>InpNights
        sTimes = sTimes(1:InpNights);
        sDates = sDates(1:InpNights);
        eTimes = eTimes(1:InpNights);
        eDates = eDates(1:InpNights);
    end
    
    [selActSig] = extractActivitySignal_new (sTimes, sDates, eTimes, eDates,...
    actDates, actTime, actSig);

%     plotNightData (selActSig, sTimes, sDates, eTimes, eDates);  % Uncomment to plot 7 nights data

    if (size(selActSig,2)==InpNights)

        allActSigNightChrIns=[allActSigNightChrIns selActSig];
        fnameChrIns = [fnameChrIns allActFNamesChrIns{i}];
        actSigChrIns = [actSigChrIns {selActSig}];
        
        count = count+1;

        for j=1:size(selActSig,2)
            allSubjNightIndsChrIns=[allSubjNightIndsChrIns;count j];
        end

        subjectNightsChrIns = [subjectNightsChrIns size(selActSig,2)];
        Date = datetime(actDates{1},'InputFormat','dd/MM/yyyy');
        Time = datetime(datestr(actTime{1},'HH:MM:SS'),'InputFormat','HH:mm:ss');
        CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');
        stTime = CnvtDT(Date,Time);          % Check Output
        stTimeChrIns = [stTimeChrIns; stTime];


        Date = datetime(actDates{size(actTime,1)},'InputFormat','dd/MM/yyyy');
        Time = datetime(datestr(actTime{end},'HH:MM:SS'),'InputFormat','HH:mm:ss');
        CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');
        enTime = CnvtDT(Date,Time);
        enTimeChrIns = [enTimeChrIns; enTime];

        e = etime(datevec((datestr(enTime,formatOut)),formatOut),datevec((datestr(stTime,formatOut)),formatOut));

        subjectsDurChrIns = [subjectsDurChrIns e/3600];
        
    end
end

% for healthy subjects
%{+
allActSigNightHealthy=[];
allSubjNightIndsHealthy=[];
subjectNightsHealthy = [];
subjectsDurHealthy = [];
[stTimeHealthy, enTimeHealthy, fnameHealthy, actSigHealthy] = deal({});
count = 0;

for i=1:length(allActSigHealthy)
    actSig=allActSigHealthy{i};
    actTime=allActTimeHealthy{i};
    actDates=allActDateHealthy{i};
    
    sTimes = spStTmHealthy{i};
    sDates = spStDateHealthy{i};
    eTimes = spEnTmHealthy{i};
    eDates = spEnDateHealthy{i};
    
    if numel(sTimes)>InpNights
        sTimes = sTimes(1:InpNights);
        sDates = sDates(1:InpNights);
        eTimes = eTimes(1:InpNights);
        eDates = eDates(1:InpNights);
    end
    
    [selActSig] = extractActivitySignal_new (sTimes, sDates, eTimes, eDates,...
    actDates, actTime, actSig);

%     plotNightData (selActSig, sTimes, sDates, eTimes, eDates);

    if (size(selActSig,2)==InpNights)

        allActSigNightHealthy=[allActSigNightHealthy selActSig];
        fnameHealthy = [fnameHealthy allActFNamesHealthy{i}];
        actSigHealthy = [actSigHealthy {selActSig}];
        
        count = count+1;
        
        for j=1:size(selActSig,2)
            allSubjNightIndsHealthy=[allSubjNightIndsHealthy;count j];
        end
        
        subjectNightsHealthy = [subjectNightsHealthy size(selActSig,2)];
        Date = datetime(actDates{1},'InputFormat','dd/MM/yyyy');
        Time = datetime(datestr(actTime{1},'HH:MM:SS'),'InputFormat','HH:mm:ss');
        CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');
        stTime = CnvtDT(Date,Time);          % Check Output
        stTimeHealthy = [stTimeHealthy; stTime];

        Date = datetime(actDates{size(actTime,1)},'InputFormat','dd/MM/yyyy');
        Time = datetime(datestr(actTime{end},'HH:MM:SS'),'InputFormat','HH:mm:ss');
        CnvtDT = @(Date,Time) datetime([Date.Year  Date.Month  Date.Day  Time.Hour  Time.Minute 0], 'Format', 'dd.MM.yyyy HH:mm');
        enTime = CnvtDT(Date,Time);
        enTimeHealthy = [enTimeHealthy; enTime];

        e = etime(datevec((datestr(enTime,formatOut)),formatOut),datevec((datestr(stTime,formatOut)),formatOut));

        subjectsDurHealthy = [subjectsDurHealthy e/3600];
        
    end
end

%% Extracting subjects with common id's
[tf, iC, iH] = intersect (fnameChrIns, fnameHealthy);
[allActNightSigHealthy, allActNightSigChrIns] = deal({});
[allSubjNightIndsHealthy, allSubjNightIndsChrIns] = deal([]);
for i=1:numel(tf)
    allActNightSigHealthy = [allActNightSigHealthy actSigHealthy{iH(i)}];
    allActNightSigChrIns = [allActNightSigChrIns actSigChrIns{iC(i)}];
    for j=1:InpNights
        allSubjNightIndsHealthy=[allSubjNightIndsHealthy;i j];
        allSubjNightIndsChrIns=[allSubjNightIndsChrIns;i j];
    end
end
    
%% Extracting features from actigraphy signals
%{+
% addpath '.\Program\Codes';

allThreshH=[0 20 40 80];
allThreshI=[0 20 40 80];

allFeaHealthy=[];
for i=1:size(allActNightSigHealthy,2)
    allFea=[];
    allFeaNames={};
    actiSig = allActNightSigHealthy{i};
    for j=1:length(allThreshH)
        temp=actiSig;
        temp(temp<=allThreshH(j))=0;
        fprintf ('Calculating features for healthy subject: %d \n',i);
        [feaVals,feaNames]=calculateActiFeatures_v1(temp);
        allFea=[allFea feaVals];
        allFeaNames=[allFeaNames feaNames];
    end
    allFeaHealthy=[allFeaHealthy;allFea];
end

allFeaChrIns=[];
for i=1:size(allActNightSigChrIns,2)
    allFea=[];
    actiSig = allActNightSigChrIns{i};
    for j=1:length(allThreshI)
        temp=actiSig;
        temp(temp<allThreshI(j))=0;
        fprintf ('Calculating features for ChrInsomina subject: %d \n',i);
        [feaVals,feaNames]=calculateActiFeatures_v1(temp);
        allFea=[allFea feaVals];
    end
    
    allFeaChrIns=[allFeaChrIns;allFea];
end

%}

%% write features to excel file with label information
%{+
currentPath = pwd;
fpath=strcat(currentPath, '\Output_Features\Features');  % Location to save features
fName = strcat (fpath, '_', num2str(InpNights),'Nights.xlsx');
xlswrite(fName,{'subjIndex' 'NightIndex' 'Label'},1,'A1');
xlswrite(fName,allFeaNames,1,'D1');
allSubjNightInds=[allSubjNightIndsHealthy;allSubjNightIndsChrIns];
allLabel=[ones(size(allSubjNightIndsHealthy,1),1);-1*ones(size(allSubjNightIndsChrIns,1),1)];
allFea=[allFeaHealthy;allFeaChrIns];

xlswrite(fName,allSubjNightInds,1,'A2');
xlswrite(fName,allLabel,1,'C2');
xlswrite(fName,allFea,1,'D2');

%% analysing individual features capacity
%{+
allP=[];
allAUC=[];
for i=1:size(allFeaHealthy,2)
    feaH=allFeaHealthy(:,i);
    feaI=allFeaChrIns(:,i);
    
    group=[ones(size(feaH));-ones(size(feaI))];
    p=kruskalwallis([feaH;feaI],group,'off');
    allP=[allP;p];
    
    [~,~,~,AUC]=perfcurve(group,[feaH;feaI],-1);
    if AUC<0.5
        AUC=1-AUC;
    end
    allAUC=[allAUC;AUC];
end
numFea = size(allFeaHealthy,2)/numel(allThreshH);
barData = [allAUC(1:numFea), allAUC(numFea+1:numFea*2),...
    allAUC(numFea*2+1:numFea*3), allAUC(numFea*3+1:numFea*4)];
figure, b=bar (barData);
set(b, {'DisplayName'}, {'InF1','InF2','InF3','InF4'}');
legend ()

set(gca,'XTickLabel',feaNames);
xtickangle (45);
ylabel ('AUC');
ylim ([0.5 0.9]);

mFeaH=nanmean(allFeaHealthy);
mFeaI=nanmean(allFeaChrIns);
sFeaH=nanstd(allFeaHealthy);
sFeaI=nanstd(allFeaChrIns);
pm=177;
for i=1:length(mFeaH)
    fprintf('%s\t%.2f %c %.2f\t%.2f %c %.2f\t%.3f\t%.2f\n',allFeaNames{i},mFeaH(i),pm,sFeaH(i),mFeaI(i),pm,sFeaI(i),allP(i),allAUC(i)); 
end
%}

