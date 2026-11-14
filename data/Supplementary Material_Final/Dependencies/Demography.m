clear all
close all
clc
%% Created by SK
%% Extract Demography Details

demoPath = 'E:\T_Sleep\Sleep\MonashData\Deakin Requested Data_v1';
[Data,actInfo] = xlsread(demoPath);
chrGnd = Data(:,2);   % male=1, female=2
chrMale = numel(chrGnd(chrGnd==1));
chrFemale = numel(chrGnd(chrGnd==2));
chrBir = actInfo (2:end,3);
startst = actInfo (2:end,4);
allActAgeChrIns = [];
for ind = 1:numel(chrBir)
    actDOB = chrBir{ind,1};
    actst = startst{ind,1};
    age = abs(datenum(actst, 'dd/mm/yy') - datenum(actDOB, 'dd/mm/yy'))./(7*52);
    allActAgeChrIns = [allActAgeChrIns; age];
end

healthyGnd = Data(:,11);
healthyMale = numel (healthyGnd(healthyGnd==1));
healthyFemale = numel (healthyGnd(healthyGnd==2));
HealthyBir = actInfo (2:end,12);
startst = actInfo (2:end,13);
allActAgeHealthy = [];
for ind = 1:numel(chrBir)
    actDOB = HealthyBir{ind,1};
    actst = startst{ind,1};
    age = abs(datenum(actst, 'dd/mm/yy') - datenum(actDOB, 'dd/mm/yy'))./(7*52);
    allActAgeHealthy = [allActAgeHealthy; age];
end

stop here;



