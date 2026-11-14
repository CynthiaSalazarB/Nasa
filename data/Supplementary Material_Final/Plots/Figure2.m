%% Created by SK
%% Raw Signal Chronic and healthy plots, the indiviual plots were combined to generate
%% one single plot check folder .\CI_Figures\Figure-2.tif

clear all;
close all
clc;

addpath ('.\Dependencies')
load ('.\Dependencies\RawSigData.mat')

figure;
for night = 1:numel(Chr7Data)
    tempData_Chr = Chr7Data{night};
    tempData_Healthy = Healthy7Data{night};
    subplot (numel(Chr7Data)*2-1, 1, 1+(night-1)*2)
    plot (tempData_Chr, '-r', 'LineWidth', 2); hold on;
    plot (tempData_Healthy, '-b', 'LineWidth', 2);
    set(gca,'XTick',[]);
    set(gca,'XTickLabel',[]);
    set(gca,'YTick',[0:250:500]);
    ylim ([0 500]);
    set(gca,'FontSize',11)
    ylabel ('Count')
    box off
    set(gca,'TickDir','out')
%     grid on;
end

edges = [10:10:500];

for night = 1:numel(Chr7Data)
    tempData_Chr = Chr7Data{night};
    tempData_Healthy = Healthy7Data{night};
           
%     subplot (3, 3, night)
%     figure, histogram (tempData, edges);
    figure, 
    h1 = histogram(tempData_Chr, edges);
    h1.FaceColor = 'r';
    hold on
    h2 = histogram(tempData_Healthy, edges);
    h2.FaceColor = 'b';
%     histogram (tempData, edges);
    ylabel ('count')
    set(gca,'XTick',[0:100:500]);
    ylim ([0 10])
%     set(gca,'YTick',[0:100:500]);
    set(gca,'FontSize',22)
%     titleStr = strcat ('Night: ', num2str(night));
%     title(titleStr);
end
