%% Created by SK
%% Feature box plots

clear all;
close all;
clc;

addpath ('.\Dependencies');
addpath ('.\Dependencies\bplot');
Path = '.\Dependencies\Data_IDMatched\ChrInsHealthy11May_7Nights';
[actData, actInfo, actRaw] = xlsread(Path);
Yw = actData (:,3);
Yw(Yw==-1) = 0; % 1=healthy 0=chrIns
Xw = actData (:,4:end);
numfea = 12;
% ######
%% Uncomment to generate plot for intensity filtering InF1=0

Xw1 = actData (:,4:numfea+3);
% Xw1 = [Xw1(:,1:2), Xw1(:,4:end)]; % Threshold 1
Xw1 = normalize(Xw1,'range');
str = '$InF_{1}=0$';
fh = figure; 
subplot (2,2,1)
boxplots (Xw1, Yw, str);

%% Uncomment to generate plot for intensity filtering InF2=20
Xw1 = actData (:,4+numfea:2*numfea+3);
% Xw1 = [Xw1(:,1:2), Xw1(:,4:end)]; % Threshold 2
Xw1 = normalize(Xw1,'range');
str = '$InF_{2}=20$';
subplot (2,2,2)
boxplots (Xw1, Yw, str);

%% Uncomment to generate plot for intensity filtering InF3=40
Xw1 = actData (:,2*numfea+3+1:3*numfea+3);
% Xw1 = [Xw1(:,1:2), Xw1(:,4:end)]; % Threshold 3
Xw1 = normalize(Xw1,'range');
str = '$InF_{3}=40$';
subplot (2,2,3)
boxplots (Xw1, Yw, str);

%% Uncomment to generate plot for intensity filtering InF4=80
Xw1 = actData (:,3*numfea+3+1:4*numfea+3);
% Xw1 = [Xw1(:,1:2), Xw1(:,4:end)]; % Threshold 4
Xw1 = normalize(Xw1,'range');
str = '$InF_{4}=80$';
subplot (2,2,4)
boxplots (Xw1, Yw, str);
fh.WindowState = 'maximized';