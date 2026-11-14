function [] = boxplots (Xw1, Yw, str)

% ######
[Data, group] = deal([]);
for fea = 1:size(Xw1,2)
    temp1 = Yw(Yw==1);
    label1 = (1+(fea-1)*2)*ones(numel(temp1),1);
    temp2 = Yw(Yw==0);
    label2 = (2+(fea-1)*2)*ones(numel(temp2),1);
    label = [label1;label2];
    Data = [Data;Xw1(:,fea)];
    group = [group;label];
end
    
positions = [1 1.25 2 2.25 3 3.25 4 4.25 5 5.25 6 6.25 7 7.25...
    8 8.25 9 9.25 10 10.25 11 11.25 12 12.25];
boxplot(Data,group, 'Notch','on', 'symbol', '', 'positions', positions);
set(gca,'xtick',[mean(positions(1:2)) mean(positions(3:4))... 
    mean(positions(5:6)) mean(positions(7:8)) mean(positions(9:10))...
    mean(positions(11:12)) mean(positions(13:14)) mean(positions(15:16))...
    mean(positions(17:18)) mean(positions(19:20)) mean(positions(21:22))...
    mean(positions(23:24))]);
set(gca,'TickLabelInterpreter', 'latex');
set(gca,'XTickLabel', {'$mean$', '$SD$', '$SD1$', '$SD2$',...
    '$ratio$', '$CCM$', '$SampEn$', '$TST$', '$WASO$', '$SWR$','$SL$', '$SE$'});
xtickangle (45);

color = ['r', 'b', 'r', 'b','r', 'b', 'r', 'b', 'r', 'b',...
    'r', 'b', 'r', 'b','r', 'b', 'r', 'b', 'r', 'b',...
    'r', 'b','r', 'b'];
h = findobj(gca,'Tag','Box');
for j=1:length(h)
   patch(get(h(j),'XData'),get(h(j),'YData'),color(j),'FaceAlpha',.5);
end

c = get(gca, 'Children');

hleg1 = legend(c(1:2), 'Healthy-Partner', 'Chronic-Insomnia' );
ylabel ('$Feature-Magnitude$', 'Interpreter', 'latex');
% xlabel ('$Feature-Name$', 'Interpreter', 'latex');
title(str, 'Interpreter', 'latex');


