% Created by SK (19Dec17)
%% Group box plot
function [] = GrpBplot (Data, group)

positions = [1 1.25 2 2.25 3 3.25 4 4.25];
boxplot(Data,group, 'Notch','on', 'symbol', '', 'positions', positions);
set(gca,'xtick',[mean(positions(1:2)) mean(positions(3:4))... 
    mean(positions(5:6)) mean(positions(7:8))]);
set(gca,'TickLabelInterpreter', 'latex');
set(gca,'XTickLabel', {'$\widehat{SD1}$', '$\widehat{SD2}$',...
    '$\widehat{ratio}$', '$\widehat{area}$'});

color = ['c', 'y', 'c', 'y','c', 'y', 'c', 'y'];
h = findobj(gca,'Tag','Box');
for j=1:length(h)
   patch(get(h(j),'XData'),get(h(j),'YData'),color(j),'FaceAlpha',.5);
end

c = get(gca, 'Children');

hleg1 = legend(c(1:2), 'GTCS', 'PNES' );
ylabel ('$DDI$', 'Interpreter', 'latex');
% set (gca, 'box', 'off');


%%
% Y     = rand(1000,1);
% X     = Y-rand(1000,1);
% ACTid = randi(6,1000,1);
% 
% xylabel = repmat('xy',1000,1);
% boxplot([X; Y], {repmat(ACTid,2,1), xylabel(:)} ,'factorgap',10)
% 
% %%
% x = [1,2,3,4,5,1,2,3,4,6];
% group = [1,1,2,2,2,3,3,3,4,4];
% positions = [1 1.25 2 2.25];
% boxplot(x,group, 'positions', positions);
% 
% set(gca,'xtick',[mean(positions(1:2)) mean(positions(3:4)) ])
% set(gca,'xticklabel',{'Direct care','Housekeeping'})
% 
% color = ['c', 'y', 'c', 'y'];
% h = findobj(gca,'Tag','Box');
% for j=1:length(h)
%    patch(get(h(j),'XData'),get(h(j),'YData'),color(j),'FaceAlpha',.5);
% end
% 
% c = get(gca, 'Children');
% 
% hleg1 = legend(c(1:2), 'Feature1', 'Feature2' );
% set (gca, 'box', 'off');
